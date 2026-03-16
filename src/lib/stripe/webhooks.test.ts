import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

const mockSubscriptionsRetrieve = vi.fn()
const mockFrom = vi.fn()
const mockProvisionInstance = vi.fn()
const mockLogInstanceEvent = vi.fn()
const mockServerAction = vi.fn()

vi.mock('./client', () => ({
  stripe: {
    subscriptions: { retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args) },
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
  })

  describe('checkout.session.completed', () => {
    it('skips if metadata is missing', async () => {
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
            metadata: { instance_id: 'inst-1', org_id: 'org-1' },
            subscription: null,
          },
        },
      } as unknown as Stripe.Event)

      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled()
    })

    it('provisions instance on successful checkout', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      })

      const instanceChain = chainMock({
        data: { id: 'inst-1', status: 'provisioning', plan: 'starter', region: 'eu-central' },
        error: null,
      })
      const orgChain = chainMock({
        data: { id: 'org-1', name: 'Test', stripe_customer_id: 'cus_123' },
        error: null,
      })

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'instances') {
          callCount++
          if (callCount === 1) return instanceChain
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
            metadata: { instance_id: 'inst-1', org_id: 'org-1' },
            subscription: 'sub_123',
          },
        },
      } as unknown as Stripe.Event)

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_123')
      expect(mockProvisionInstance).toHaveBeenCalled()
      expect(mockLogInstanceEvent).toHaveBeenCalledWith(
        'inst-1',
        'payment_completed',
        expect.objectContaining({ subscription_id: 'sub_123' })
      )
    })

    it('skips provisioning if instance already processed (idempotency)', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      })

      const instanceChain = chainMock({ data: null, error: { code: 'PGRST116' } })
      mockFrom.mockReturnValue(instanceChain)

      await handleStripeEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { instance_id: 'inst-1', org_id: 'org-1' },
            subscription: 'sub_123',
          },
        },
      } as unknown as Stripe.Event)

      expect(mockProvisionInstance).not.toHaveBeenCalled()
    })

    it('sets instance to error if provisioning fails', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      })

      const instanceChain = chainMock({
        data: { id: 'inst-1', status: 'provisioning' },
        error: null,
      })
      const orgChain = chainMock({
        data: { id: 'org-1', stripe_customer_id: 'cus_123' },
        error: null,
      })

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'instances') {
          callCount++
          if (callCount === 1) return instanceChain
          return chainMock({ data: null, error: null })
        }
        if (table === 'organizations') return orgChain
        if (table === 'instance_events') return chainMock({ data: null, error: null })
        return chainMock({ data: null, error: null })
      })

      mockProvisionInstance.mockRejectedValue(new Error('Hetzner API down'))

      await handleStripeEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { instance_id: 'inst-1', org_id: 'org-1' },
            subscription: 'sub_123',
          },
        },
      } as unknown as Stripe.Event)

      expect(mockLogInstanceEvent).toHaveBeenCalledWith(
        'inst-1',
        'error',
        expect.objectContaining({ error: 'Hetzner API down' })
      )
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

  describe('billing.meter events', () => {
    it('handles meter events without throwing', async () => {
      for (const type of [
        'billing.meter.created',
        'billing.meter.updated',
        'billing.meter.deactivated',
        'billing.meter.reactivated',
      ]) {
        await expect(
          handleStripeEvent({
            type,
            data: { object: { id: 'mtr_123', display_name: 'Test', status: 'active' } },
          } as unknown as Stripe.Event)
        ).resolves.not.toThrow()
      }
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
