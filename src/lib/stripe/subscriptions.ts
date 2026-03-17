import Stripe from 'stripe'
import { stripe } from './client'

interface CreateCheckoutParams {
  customerId: string
  priceId: string
  orgId: string
  orgSlug: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export async function createInstanceCheckout(
  params: CreateCheckoutParams
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    line_items: [
      { price: params.priceId, quantity: 1 },
    ],
    subscription_data: {
      metadata: params.metadata,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
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
