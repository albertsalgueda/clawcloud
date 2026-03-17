import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCheckoutCreate = vi.fn()
const mockCancel = vi.fn()
const mockUpdate = vi.fn()

vi.mock('./client', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCheckoutCreate(...args),
      },
    },
    subscriptions: {
      cancel: (...args: unknown[]) => mockCancel(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

import {
  cancelSubscription,
  createInstanceCheckout,
  updateSubscriptionPlan,
} from './subscriptions'

describe('subscription helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_TOKEN_USAGE = 'price_usage'
  })

  it('creates a checkout session with subscription metadata', async () => {
    mockCheckoutCreate.mockResolvedValue({ id: 'cs_123' })

    await createInstanceCheckout({
      customerId: 'cus_123',
      priceId: 'price_plan',
      orgId: 'org-1',
      orgSlug: 'acme',
      metadata: { org_id: 'org-1', instance_id: 'inst-1' },
      successUrl: 'https://app.example/success',
      cancelUrl: 'https://app.example/cancel',
    })

    expect(mockCheckoutCreate).toHaveBeenCalledWith({
      customer: 'cus_123',
      mode: 'subscription',
      line_items: [
        { price: 'price_plan', quantity: 1 },
        { price: 'price_usage' },
      ],
      subscription_data: {
        metadata: { org_id: 'org-1', instance_id: 'inst-1' },
      },
      success_url: 'https://app.example/success',
      cancel_url: 'https://app.example/cancel',
      metadata: { org_id: 'org-1', instance_id: 'inst-1' },
    })
  })

  it('cancels a subscription', async () => {
    mockCancel.mockResolvedValue({ id: 'sub_123' })

    await expect(cancelSubscription('sub_123')).resolves.toEqual({ id: 'sub_123' })
    expect(mockCancel).toHaveBeenCalledWith('sub_123')
  })

  it('updates a subscription plan with proration enabled', async () => {
    mockUpdate.mockResolvedValue({ id: 'sub_123' })

    await expect(
      updateSubscriptionPlan('sub_123', 'si_123', 'price_new')
    ).resolves.toEqual({ id: 'sub_123' })

    expect(mockUpdate).toHaveBeenCalledWith('sub_123', {
      items: [{ id: 'si_123', price: 'price_new' }],
      proration_behavior: 'always_invoice',
    })
  })
})
