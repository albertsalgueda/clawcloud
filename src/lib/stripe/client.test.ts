import { beforeEach, describe, expect, it, vi } from 'vitest'

let stripeInstance: Record<string, unknown> | null = null

const mockStripeConstructor = vi.fn(function StripeMock() {
  return stripeInstance
})

vi.mock('stripe', () => ({
  default: mockStripeConstructor,
}))

describe('stripe client proxy', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.STRIPE_SECRET_KEY
  })

  it('throws when STRIPE_SECRET_KEY is missing', async () => {
    const { stripe } = await import('./client')

    expect(() => stripe.customers).toThrow('STRIPE_SECRET_KEY is not set')
  })

  it('lazily constructs Stripe once and reuses the same instance', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'

    stripeInstance = {
      customers: { create: vi.fn() },
      subscriptions: { retrieve: vi.fn() },
    }

    const { stripe } = await import('./client')

    expect(mockStripeConstructor).not.toHaveBeenCalled()
    expect(stripe.customers).toBe(stripeInstance.customers)
    expect(stripe.subscriptions).toBe(stripeInstance.subscriptions)
    expect(mockStripeConstructor).toHaveBeenCalledTimes(1)
    expect(mockStripeConstructor).toHaveBeenCalledWith('sk_test_123', { typescript: true })
  })
})
