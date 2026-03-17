import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

const mockSubscriptionsRetrieve = vi.fn()
const mockCustomersRetrieve = vi.fn()
const mockPaymentIntentsCreate = vi.fn()
const mockFrom = vi.fn()
const mockProvisionInstance = vi.fn()
const mockLogInstanceEvent = vi.fn()
const mockServerAction = vi.fn()
const mockAddCredits = vi.fn()

vi.mock('./client', () => ({
  stripe: {
    subscriptions: { retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args) },
    customers: { retrieve: (...args: unknown[]) => mockCustomersRetrieve(...args) },
    paymentIntents: { create: (...args: unknown[]) => mockPaymentIntentsCreate(...args) },
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/control-plane', () => ({
  provisionInstance: (...args: unknown[]) => mockProvisionInstance(...args),
  logInstanceEvent: (...args: unknown[]) => mockLogInstanceEvent(...args),
}))

vi.mock('@/lib/hetzner/servers', () => ({
  serverAction: (...args: unknown[]) => mockServerAction(...args),
}))

vi.mock('@/lib/credits/balance', () => ({
  addCredits: (...args: unknown[]) => mockAddCredits(...args),
}))

vi.mock('@/lib/constants', () => ({
  CREDIT_DEFAULTS: {
    INITIAL_CREDIT_EUR: 5,
    AUTO_TOPUP_AMOUNT_EUR: 20,
    AUTO_TOPUP_THRESHOLD_EUR: 2,
  },
}))

import { handleStripeEvent } from './webhooks'

function chainMock(returnValue: unknown) {
  const chain: Record<string, any> = {}
  const terminal = () => Promise.resolve(returnValue)
  const methods = ['from', 'select', 'update', 'insert', 'eq', 'in', 'single', 'order', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn(terminal)
  return chain
}

describe('handleStripeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddCredits.mockResolvedValue(5)
  })

  describe('checkout.session.completed', () => {
    const validMeta = {
      org_id: 'org-1',
      instance_name: 'Test Instance',
      instance_slug: 'test-instance',
      instance_plan: 'starter',
      instance_region: 'eu-central',
      created_by: 'user-1',
    }

    it('skips if metadata is missing required fields', async () => {
      await handleStripeEvent({
        type: 'checkout.session.completed',
        data: { object: { metadata: {} } },
      } as unknown as Stripe.Event)

      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled()
    })

    it('skips if no subscription on session', async () => {
      await handleStripeEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: validMeta,
            subscription: null,
          },
        },
      } as unknown as Stripe.Event)

      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled()
    })

    it('creates instance and provisions on successful checkout', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      })

      mockCustomersRetrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: { default_payment_method: 'pm_123' },
      })

      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_initial',
        status: 'succeeded',
      })

      const idempotencyChain = chainMock({ data: null, error: { code: 'PGRST116' } })
      const insertChain = chainMock({
        data: { id: 'inst-new', status: 'provisioning', plan: 'starter', region: 'eu-central' },
        error: null,
      })
      const orgChain = chainMock({
        data: { id: 'org-1', name: 'Test', stripe_customer_id: 'cus_123' },
        error: null,
      })

      let instanceCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'instances') {
          instanceCallCount++
          if (instanceCallCount === 1) return idempotencyChain
          if (instanceCallCount === 2) return insertChain
          return chainMock({ data: null, error: null })
        }
        if (table === 'organizations') return orgChain
        if (table === 'instance_events') return chainMock({ data: null, error: null })
        return chainMock({ data: null, error: null })
      })

      mockProvisionInstance.mockResolvedValue(undefined)

      await handleStripeEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: validMeta,
            subscription: 'sub_123',
          },
        },
      } as unknown as Stripe.Event)

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_123')
      expect(mockProvisionInstance).toHaveBeenCalled()
      // Initial credits should be charged
      expect(mockAddCredits).toHaveBeenCalledWith(
        'org-1',
        5,
        expect.objectContaining({ stripePaymentIntentId: 'pi_initial' }),
      )
    })

    it('skips if instance for subscription already exists (idempotency)', async () => {
      const existingChain = chainMock({ data: { id: 'inst-existing' }, error: null })
      mockFrom.mockReturnValue(existingChain)

      await handleStripeEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: validMeta,
            subscription: 'sub_123',
          },
        },
      } as unknown as Stripe.Event)

      expect(mockProvisionInstance).not.toHaveBeenCalled()
    })
  })

  describe('payment_intent.succeeded', () => {
    it('adds credits for credit_topup payment intents', async () => {
      const txnChain = chainMock({ data: [], error: null })
      txnChain.single = undefined as any
      txnChain.limit = vi.fn(() => Promise.resolve({ data: [], error: null }))
      const orgChain = chainMock({ data: null, error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'credit_transactions') return txnChain
        if (table === 'organizations') return orgChain
        return chainMock({ data: null, error: null })
      })

      await handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_topup_123',
            amount: 2000,
            metadata: { type: 'credit_topup', org_id: 'org-1' },
          },
        },
      } as unknown as Stripe.Event)

      expect(mockAddCredits).toHaveBeenCalledWith(
        'org-1',
        20,
        expect.objectContaining({ stripePaymentIntentId: 'pi_topup_123' }),
      )
    })

    it('ignores non-credit-topup payment intents', async () => {
      await handleStripeEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_other',
            amount: 599,
            metadata: { type: 'something_else' },
          },
        },
      } as unknown as Stripe.Event)

      expect(mockAddCredits).not.toHaveBeenCalled()
    })
  })

  describe('payment_intent.payment_failed', () => {
    it('sets auto_topup_failed for credit topup failures', async () => {
      const orgChain = chainMock({ data: null, error: null })
      mockFrom.mockReturnValue(orgChain)

      await handleStripeEvent({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_fail',
            metadata: { type: 'credit_topup', org_id: 'org-1' },
          },
        },
      } as unknown as Stripe.Event)

      expect(mockFrom).toHaveBeenCalledWith('organizations')
    })
  })

  describe('customer.subscription.deleted', () => {
    it('stops instance and shuts down server', async () => {
      const chain = chainMock({
        data: { id: 'inst-1', hetzner_server_id: 12345 },
        error: null,
      })
      mockFrom.mockReturnValue(chain)
      mockServerAction.mockResolvedValue(undefined)

      await handleStripeEvent({
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_123', metadata: {} },
        },
      } as unknown as Stripe.Event)

      expect(mockServerAction).toHaveBeenCalledWith(12345, 'shutdown')
    })
  })

  describe('unknown events', () => {
    it('silently ignores unknown event types', async () => {
      await expect(
        handleStripeEvent({
          type: 'some.unknown.event',
          data: { object: {} },
        } as unknown as Stripe.Event)
      ).resolves.not.toThrow()
    })
  })
})
