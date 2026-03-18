import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

vi.mock('./client', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
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
    credit_balance_eur: '0',
    auto_topup_enabled: true,
    auto_topup_amount_eur: '20',
    auto_topup_threshold_eur: '2',
    credit_limit_eur: null,
    auto_topup_failed: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('ensureStripeCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing stripe_customer_id if valid in current mode', async () => {
    const org = makeOrg({ stripe_customer_id: 'cus_existing' })
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_existing' } as Stripe.Customer)
    const result = await ensureStripeCustomer(org)

    expect(result).toBe('cus_existing')
    expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_existing')
    expect(stripe.customers.create).not.toHaveBeenCalled()
  })

  it('creates new customer if existing ID is from wrong Stripe mode', async () => {
    const org = makeOrg({ stripe_customer_id: 'cus_live_mode_id' })
    vi.mocked(stripe.customers.retrieve).mockRejectedValue(new Error('No such customer'))
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_test_new' } as Stripe.Customer)

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: mockUpdate } as ReturnType<typeof supabaseAdmin.from>)

    const result = await ensureStripeCustomer(org)

    expect(result).toBe('cus_test_new')
    expect(stripe.customers.create).toHaveBeenCalled()
  })

  it('creates a Stripe customer when none exists', async () => {
    const org = makeOrg({ stripe_customer_id: null })
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new123' } as Stripe.Customer)

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: mockUpdate } as ReturnType<typeof supabaseAdmin.from>)

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
