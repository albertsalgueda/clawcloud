import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { serverAction } from '@/lib/hetzner/servers'

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
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
  }
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

  await supabaseAdmin.from('instance_events').insert({
    instance_id: instanceId,
    event_type: 'created',
    details: { subscription_id: sub.id },
  })
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
    .from('customers')
    .update({ updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!customer) return

  const { data: customerInstances } = await supabaseAdmin
    .from('instances')
    .select('id, hetzner_server_id')
    .eq('customer_id', customer.id)
    .eq('status', 'running')

  if (!customerInstances) return

  for (const inst of customerInstances) {
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
