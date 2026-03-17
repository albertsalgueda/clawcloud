import Stripe from 'stripe'
import { stripe } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { serverAction } from '@/lib/hetzner/servers'
import { provisionInstance, logInstanceEvent } from '@/lib/control-plane'
import { addCredits } from '@/lib/credits/balance'
import { CREDIT_DEFAULTS } from '@/lib/constants'
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
    case 'payment_intent.succeeded':
      return handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
    case 'payment_intent.payment_failed':
      return handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const meta = session.metadata ?? {}
  const orgId = meta.org_id
  const name = meta.instance_name
  const slug = meta.instance_slug
  const plan = meta.instance_plan
  const region = meta.instance_region
  const createdBy = meta.created_by

  if (!orgId || !name || !slug || !plan || !region) {
    console.error('Checkout session missing required instance metadata', meta)
    return
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  if (!subscriptionId) {
    console.error(`Checkout completed but no subscription (session ${session.id})`)
    return
  }

  // Idempotency: check if an instance with this subscription already exists
  const { data: existing } = await supabaseAdmin
    .from('instances')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (existing) {
    console.log(`Instance for subscription ${subscriptionId} already exists, skipping`)
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const { data: instance, error: insertError } = await supabaseAdmin
    .from('instances')
    .insert({
      org_id: orgId,
      created_by: createdBy || null,
      name,
      slug,
      plan,
      region,
      status: 'provisioning',
      stripe_subscription_id: subscription.id,
      stripe_subscription_item_id: subscription.items.data[0]?.id,
    })
    .select()
    .single()

  if (insertError || !instance) {
    console.error('Failed to create instance after checkout:', insertError?.message)
    return
  }

  await logInstanceEvent(instance.id, 'payment_completed', {
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

  // Charge initial credits via off-session PaymentIntent
  try {
    if (org.stripe_customer_id) {
      const customer = await stripe.customers.retrieve(org.stripe_customer_id)
      if (!customer.deleted) {
        const defaultPm =
          typeof customer.invoice_settings?.default_payment_method === 'string'
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings?.default_payment_method?.id

        if (defaultPm) {
          const pi = await stripe.paymentIntents.create({
            amount: Math.round(CREDIT_DEFAULTS.INITIAL_CREDIT_EUR * 100),
            currency: 'eur',
            customer: org.stripe_customer_id,
            payment_method: defaultPm,
            off_session: true,
            confirm: true,
            metadata: {
              type: 'credit_topup',
              org_id: orgId,
              reason: 'initial_credits',
            },
          })

          if (pi.status === 'succeeded') {
            await addCredits(orgId, CREDIT_DEFAULTS.INITIAL_CREDIT_EUR, {
              stripePaymentIntentId: pi.id,
              description: `Initial credits €${CREDIT_DEFAULTS.INITIAL_CREDIT_EUR.toFixed(2)}`,
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to charge initial credits:', err)
  }

  try {
    await provisionInstance(instance, org as Organization)
  } catch (err) {
    console.error('Provisioning failed after checkout:', err)
    await supabaseAdmin
      .from('instances')
      .update({ status: 'error' })
      .eq('id', instance.id)
    await logInstanceEvent(instance.id, 'error', {
      error: err instanceof Error ? err.message : 'Provisioning failed after payment',
    })
  }
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const meta = pi.metadata ?? {}
  if (meta.type !== 'credit_topup') return

  const orgId = meta.org_id
  if (!orgId) return

  // Idempotency: check if credits were already added for this PI
  const { data: existing } = await supabaseAdmin
    .from('credit_transactions')
    .select('id')
    .eq('stripe_payment_intent_id', pi.id)
    .limit(1)

  if (existing && existing.length > 0) return

  const amountEur = pi.amount / 100
  await addCredits(orgId, amountEur, {
    stripePaymentIntentId: pi.id,
    description: meta.reason === 'initial_credits'
      ? `Initial credits €${amountEur.toFixed(2)}`
      : `Credit top-up €${amountEur.toFixed(2)}`,
  })

  // Clear auto-topup failure flag
  await supabaseAdmin
    .from('organizations')
    .update({ auto_topup_failed: false })
    .eq('id', orgId)
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const meta = pi.metadata ?? {}
  if (meta.type !== 'credit_topup') return

  const orgId = meta.org_id
  if (!orgId) return

  await supabaseAdmin
    .from('organizations')
    .update({ auto_topup_failed: true })
    .eq('id', orgId)
}

async function handleSubscriptionCreated(_sub: Stripe.Subscription): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
  // Instance creation is handled in handleCheckoutCompleted.
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
