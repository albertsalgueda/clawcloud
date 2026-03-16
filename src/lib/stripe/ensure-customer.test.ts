import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
  },
}))

import { ensureStripeCustomer } from './ensure-customer'
import { stripe } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Organization } from '@/lib/auth'

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    stripe_customer_id: null,
    plan: 'starter',
    max_instances: 50,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('ensureStripeCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing stripe_customer_id without calling Stripe', async () => {
    const org = makeOrg({ stripe_customer_id: 'cus_existing' })
    const result = await ensureStripeCustomer(org)

    expect(result).toBe('cus_existing')
    expect(stripe.customers.create).not.toHaveBeenCalled()
  })

  it('creates a Stripe customer when none exists', async () => {
    const org = makeOrg({ stripe_customer_id: null })
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new123' } as any)

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: mockUpdate } as any)

    const result = await ensureStripeCustomer(org)

    expect(result).toBe('cus_new123')
    expect(stripe.customers.create).toHaveBeenCalledWith({
      name: 'Test Org',
      metadata: { org_id: 'org-1', org_slug: 'test-org' },
    })
    expect(supabaseAdmin.from).toHaveBeenCalledWith('organizations')
    expect(mockUpdate).toHaveBeenCalledWith({ stripe_customer_id: 'cus_new123' })
  })

  it('returns null when Stripe customer creation fails', async () => {
    const org = makeOrg({ stripe_customer_id: null })
    vi.mocked(stripe.customers.create).mockRejectedValue(new Error('Stripe API error'))

    const result = await ensureStripeCustomer(org)

    expect(result).toBeNull()
  })
})
