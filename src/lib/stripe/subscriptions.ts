import Stripe from 'stripe'
import { stripe } from './client'

interface CreateSubscriptionParams {
  customerId: string
  priceId: string
  metadata: {
    instance_id: string
    customer_id: string
  }
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [
      { price: params.priceId },
      { price: process.env.STRIPE_PRICE_TOKEN_USAGE! },
    ],
    metadata: params.metadata,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  })
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.cancel(subscriptionId)
}

export async function updateSubscriptionPlan(
  subscriptionId: string,
  currentItemId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: currentItemId, price: newPriceId }],
    proration_behavior: 'always_invoice',
  })
}
