import Stripe from 'stripe'
import { stripe } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { serverAction } from '@/lib/hetzner/servers'
import { provisionInstance, logInstanceEvent } from '@/lib/control-plane'
import type { Organization } from '@/lib/auth'

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    case 'customer.subscription.created':
      return handleSubscriptionCreated(event.data.object as Stripe.Subscription)
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
    case 'invoice.paid':
      return handleInvoicePaid(event.data.object as Stripe.Invoice)
    case 'invoice.payment_failed':
      return handlePaymentFailed(event.data.object as Stripe.Invoice)
    case 'billing.meter.created':
    case 'billing.meter.updated':
    case 'billing.meter.deactivated':
    case 'billing.meter.reactivated':
      return handleBillingMeterEvent(event)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const instanceId = session.metadata?.instance_id
  const orgId = session.metadata?.org_id
  if (!instanceId || !orgId) return

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  if (!subscriptionId) {
    console.error(`Checkout completed but no subscription for instance ${instanceId}`)
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Only transition from pending_payment to prevent duplicate provisioning
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('instances')
    .update({
      status: 'provisioning',
      stripe_subscription_id: subscription.id,
      stripe_subscription_item_id: subscription.items.data[0]?.id,
    })
    .eq('id', instanceId)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (updateError || !updated) {
    console.log(`Instance ${instanceId} already processed (not in pending_payment), skipping`)
    return
  }

  await logInstanceEvent(instanceId, 'payment_completed', {
    subscription_id: subscription.id,
    checkout_session_id: session.id,
  })

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (!org) {
    console.error(`Cannot provision: org ${orgId} not found`)
    return
  }

  try {
    await provisionInstance(updated, org as Organization)
  } catch (err) {
    console.error('Provisioning failed after checkout:', err)
    await supabaseAdmin
      .from('instances')
      .update({ status: 'error' })
      .eq('id', instanceId)
    await logInstanceEvent(instanceId, 'error', {
      error: err instanceof Error ? err.message : 'Provisioning failed after payment',
    })
  }
}

async function handleBillingMeterEvent(event: Stripe.Event): Promise<void> {
  const meter = event.data.object as { id?: string; display_name?: string; status?: string }
  console.log(
    `[stripe:${event.type}] meter=${meter.id ?? 'unknown'} ` +
    `name="${meter.display_name ?? ''}" status=${meter.status ?? 'n/a'}`
  )
}

async function handleSubscriptionCreated(sub: Stripe.Subscription): Promise<void> {
  const instanceId = sub.metadata?.instance_id
  if (!instanceId) return

  await supabaseAdmin
    .from('instances')
    .update({
      stripe_subscription_id: sub.id,
      stripe_subscription_item_id: sub.items.data[0]?.id,
    })
    .eq('id', instanceId)
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const instanceId = sub.metadata?.instance_id
  if (!instanceId) return

  const planMetadata = sub.items.data[0]?.price?.metadata?.plan
  if (planMetadata) {
    await supabaseAdmin
      .from('instances')
      .update({ plan: planMetadata })
      .eq('id', instanceId)
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const { data: instance } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('stripe_subscription_id', sub.id)
    .single()

  if (!instance) return

  if (instance.hetzner_server_id) {
    try {
      await serverAction(instance.hetzner_server_id, 'shutdown')
    } catch {
      // Server may already be off
    }
  }

  await supabaseAdmin
    .from('instances')
    .update({ status: 'stopped' })
    .eq('id', instance.id)

  await supabaseAdmin.from('instance_events').insert({
    instance_id: instance.id,
    event_type: 'stopped',
    details: { reason: 'subscription_deleted' },
  })
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  await supabaseAdmin
    .from('organizations')
    .update({ updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!org) return

  const { data: orgInstances } = await supabaseAdmin
    .from('instances')
    .select('id, hetzner_server_id')
    .eq('org_id', org.id)
    .eq('status', 'running')

  if (!orgInstances) return

  for (const inst of orgInstances) {
    if (inst.hetzner_server_id) {
      try {
        await serverAction(inst.hetzner_server_id, 'shutdown')
      } catch {
        // Best effort
      }
    }

    await supabaseAdmin
      .from('instances')
      .update({ status: 'stopped' })
      .eq('id', inst.id)

    await supabaseAdmin.from('instance_events').insert({
      instance_id: inst.id,
      event_type: 'stopped',
      details: { reason: 'payment_failed' },
    })
  }
}
