import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.STRIPE_METER_ID = 'mtr_test123'

const mockListEventSummaries = vi.fn()
const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('./client', () => ({
  stripe: {
    billing: {
      meters: {
        listEventSummaries: (...args: unknown[]) => mockListEventSummaries(...args),
      },
    },
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  usageEvents: {
    id: 'id',
    instance_id: 'instance_id',
    org_id: 'org_id',
    model: 'model',
    input_tokens: 'input_tokens',
    output_tokens: 'output_tokens',
    cost_usd: 'cost_usd',
    billed_usd: 'billed_usd',
    stripe_meter_event_id: 'stripe_meter_event_id',
    created_at: 'created_at',
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

import { syncMeterUsage } from './meter-sync'

function chainMock(returnValue: unknown) {
  const chain: Record<string, any> = {}
  const methods = ['from', 'select', 'where', 'limit', 'eq', 'not', 'order', 'single', 'set', 'values']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  chain.single = vi.fn(() => Promise.resolve(returnValue))
  chain.then = (resolve: (v: unknown) => void) => resolve(returnValue)
  return chain
}

describe('syncMeterUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_METER_ID = 'mtr_test123'
  })

  it('returns synced: 0 when the meter id is missing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    delete process.env.STRIPE_METER_ID

    await expect(
      syncMeterUsage(
        'org-1', 'cus_123',
        new Date('2026-03-01'), new Date('2026-03-31')
      )
    ).resolves.toEqual({ synced: 0 })

    expect(console.warn).toHaveBeenCalledWith('STRIPE_METER_ID not set, skipping meter sync')
  })

  it('returns synced: 0 when start >= end', async () => {
    const result = await syncMeterUsage(
      'org-1', 'cus_123',
      new Date('2026-03-31'), new Date('2026-03-01')
    )
    expect(result).toEqual({ synced: 0 })
  })

  it('returns synced: 0 when no summaries from Stripe', async () => {
    mockListEventSummaries.mockResolvedValue({
      data: [],
      has_more: false,
    })

    const result = await syncMeterUsage(
      'org-1', 'cus_123',
      new Date('2026-03-01'), new Date('2026-03-31')
    )
    expect(result).toEqual({ synced: 0 })
  })

  it('handles pagination and stops on empty page', async () => {
    mockListEventSummaries
      .mockResolvedValueOnce({
        data: [{ id: 's1', aggregated_value: 1000, start_time: 1709251200, end_time: 1709337600 }],
        has_more: true,
      })
      .mockResolvedValueOnce({ data: [], has_more: true })

    mockSupabaseFrom.mockReturnValue(
      chainMock({ data: { id: 'inst-1' }, error: null })
    )

    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })

    mockDbInsert.mockReturnValue({
      values: vi.fn(() => Promise.resolve()),
    })

    const result = await syncMeterUsage(
      'org-1', 'cus_123',
      new Date('2026-03-01'), new Date('2026-03-31')
    )

    expect(mockListEventSummaries).toHaveBeenCalledTimes(2)
    expect(result.synced).toBe(1)
  })

  it('updates an existing usage event when the meter record already exists', async () => {
    mockListEventSummaries.mockResolvedValue({
      data: [{ id: 's1', aggregated_value: 1000, start_time: 1709251200, end_time: 1709337600 }],
      has_more: false,
    })

    mockSupabaseFrom.mockReturnValue(
      chainMock({ data: { id: 'inst-1' }, error: null })
    )

    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 'existing' }])),
        })),
      })),
    })

    const mockWhere = vi.fn(() => Promise.resolve())
    const mockSet = vi.fn(() => ({ where: mockWhere }))
    mockDbUpdate.mockReturnValue({
      set: mockSet,
    })

    const result = await syncMeterUsage(
      'org-1', 'cus_123',
      new Date('2026-03-01'), new Date('2026-03-31')
    )

    expect(result).toEqual({ synced: 1 })
    expect(mockDbUpdate).toHaveBeenCalled()
    expect(mockSet).toHaveBeenCalledWith({
      input_tokens: 800,
      output_tokens: 200,
      cost_usd: '0.003',
      billed_usd: '0.003',
    })
  })
})
