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
  chain.then = (resolve: (value: unknown) => void) => resolve(returnValue)
  return chain
}

describe('handleStripeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    it('sets instance to error if provisioning fails', async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      })

      const idempotencyChain = chainMock({ data: null, error: { code: 'PGRST116' } })
      const insertChain = chainMock({
        data: { id: 'inst-new', status: 'provisioning' },
        error: null,
      })
      const orgChain = chainMock({
        data: { id: 'org-1', stripe_customer_id: 'cus_123' },
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

      mockProvisionInstance.mockRejectedValue(new Error('Hetzner API down'))

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

      expect(mockLogInstanceEvent).toHaveBeenCalledWith(
        'inst-new',
        'error',
        expect.objectContaining({ error: 'Hetzner API down' })
      )
    })

    it('logs and exits if the instance insert fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      })

      let instanceCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'instances') {
          instanceCallCount++
          if (instanceCallCount === 1) {
            return chainMock({ data: null, error: { code: 'PGRST116' } })
          }
          return chainMock({
            data: null,
            error: { message: 'insert failed' },
          })
        }
        return chainMock({ data: null, error: null })
      })

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

      expect(console.error).toHaveBeenCalledWith(
        'Failed to create instance after checkout:',
        'insert failed'
      )
    })

    it('logs and exits if the organization cannot be found after checkout', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      })

      const idempotencyChain = chainMock({ data: null, error: { code: 'PGRST116' } })
      const insertChain = chainMock({
        data: { id: 'inst-new', status: 'provisioning', plan: 'starter', region: 'eu-central' },
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
        if (table === 'organizations') return chainMock({ data: null, error: null })
        return chainMock({ data: null, error: null })
      })

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

      expect(console.error).toHaveBeenCalledWith('Cannot provision: org org-1 not found')
      expect(mockProvisionInstance).not.toHaveBeenCalled()
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

  describe('customer.subscription lifecycle updates', () => {
    it('treats subscription.created as a no-op', async () => {
      await expect(
        handleStripeEvent({
          type: 'customer.subscription.created',
          data: { object: { id: 'sub_123' } },
        } as unknown as Stripe.Event)
      ).resolves.toBeUndefined()

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('updates an instance plan from subscription metadata', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      mockFrom.mockReturnValue({ update: mockUpdate })

      await handleStripeEvent({
        type: 'customer.subscription.updated',
        data: {
          object: {
            metadata: { instance_id: 'inst-1' },
            items: {
              data: [{ price: { metadata: { plan: 'pro' } } }],
            },
          },
        },
      } as unknown as Stripe.Event)

      expect(mockUpdate).toHaveBeenCalledWith({ plan: 'pro' })
      expect(mockEq).toHaveBeenCalledWith('id', 'inst-1')
    })
  })

  describe('invoice events', () => {
    it('updates the organization timestamp after a paid invoice', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      mockFrom.mockReturnValue({ update: mockUpdate })

      await handleStripeEvent({
        type: 'invoice.paid',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as unknown as Stripe.Event)

      expect(mockUpdate).toHaveBeenCalledWith({
        updated_at: expect.any(String),
      })
      expect(mockEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_123')
    })

    it('stops running instances when payment fails', async () => {
      const orgChain = chainMock({
        data: { id: 'org-1' },
        error: null,
      })
      const updateEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const eventInserts: Array<Record<string, unknown>> = []
      const runningInstances = [
        { id: 'inst-1', hetzner_server_id: 12345 },
        { id: 'inst-2', hetzner_server_id: null },
      ]
      const instancesChain: Record<string, any> = {
        select: vi.fn(() => instancesChain),
        eq: vi.fn(() => instancesChain),
        update: vi.fn(() => ({
          eq: updateEq,
        })),
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: runningInstances, error: null }),
      }

      mockServerAction.mockRejectedValueOnce(new Error('already off'))
      mockFrom.mockImplementation((table: string) => {
        if (table === 'organizations') return orgChain
        if (table === 'instances') return instancesChain
        if (table === 'instance_events') {
          return {
            insert: vi.fn(async (payload: Record<string, unknown>) => {
              eventInserts.push(payload)
              return { data: null, error: null }
            }),
          }
        }
        return chainMock({ data: null, error: null })
      })

      await handleStripeEvent({
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: { id: 'cus_123' },
          },
        },
      } as unknown as Stripe.Event)

      expect(mockServerAction).toHaveBeenCalledWith(12345, 'shutdown')
      expect(updateEq).toHaveBeenCalledTimes(2)
      expect(updateEq).toHaveBeenNthCalledWith(1, 'id', 'inst-1')
      expect(updateEq).toHaveBeenNthCalledWith(2, 'id', 'inst-2')
      expect(eventInserts).toEqual([
        {
          instance_id: 'inst-1',
          event_type: 'stopped',
          details: { reason: 'payment_failed' },
        },
        {
          instance_id: 'inst-2',
          event_type: 'stopped',
          details: { reason: 'payment_failed' },
        },
      ])
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
