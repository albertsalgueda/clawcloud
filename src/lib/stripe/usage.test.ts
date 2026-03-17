import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockAnd = vi.fn((...conditions: unknown[]) => ({ type: 'and', conditions }))
const mockEq = vi.fn((field: unknown, value: unknown) => ({ type: 'eq', field, value }))
const mockGte = vi.fn((field: unknown, value: unknown) => ({ type: 'gte', field, value }))
const mockLte = vi.fn((field: unknown, value: unknown) => ({ type: 'lte', field, value }))

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  usageEvents: {
    org_id: 'org_id',
    created_at: 'created_at',
    instance_id: 'instance_id',
    model: 'model',
    input_tokens: 'input_tokens',
    output_tokens: 'output_tokens',
    billed_usd: 'billed_usd',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => mockEq(...args),
  and: (...args: unknown[]) => mockAnd(...args),
  gte: (...args: unknown[]) => mockGte(...args),
  lte: (...args: unknown[]) => mockLte(...args),
  sql: (strings: TemplateStringsArray) => strings.join(''),
}))

import { getOrgUsageSummary } from './usage'

function queryResult<T>(result: T) {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.groupBy = vi.fn(() => chain)
  chain.orderBy = vi.fn(() => chain)
  chain.then = (resolve: (value: T) => void) => resolve(result)
  return chain
}

describe('getOrgUsageSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns aggregated usage totals and numeric output', async () => {
    mockSelect
      .mockReturnValueOnce(queryResult([
        {
          model: 'gpt-4o',
          input_tokens: '100',
          output_tokens: '50',
          cost: '1.25',
        },
      ]))
      .mockReturnValueOnce(queryResult([
        {
          date: '2026-03-17',
          cost: '1.25',
        },
      ]))

    const start = new Date('2026-03-01T00:00:00Z')
    const end = new Date('2026-03-31T23:59:59Z')

    await expect(getOrgUsageSummary('org-1', start, end)).resolves.toEqual({
      period: { start, end },
      base_cost: 0,
      token_cost: 1.25,
      total_cost: 1.25,
      by_model: [
        {
          model: 'gpt-4o',
          input_tokens: 100,
          output_tokens: 50,
          cost: 1.25,
        },
      ],
      daily: [
        {
          date: '2026-03-17',
          cost: 1.25,
        },
      ],
    })

    expect(mockAnd).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'eq', field: 'org_id', value: 'org-1' }),
      expect.objectContaining({ type: 'gte', field: 'created_at', value: start }),
      expect.objectContaining({ type: 'lte', field: 'created_at', value: end })
    )
  })

  it('adds the instance filter when instanceId is provided', async () => {
    mockSelect.mockReturnValue(queryResult([]))

    await getOrgUsageSummary(
      'org-1',
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-31T23:59:59Z'),
      'inst-1'
    )

    expect(mockAnd).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'eq', field: 'org_id', value: 'org-1' }),
      expect.objectContaining({ type: 'gte', field: 'created_at' }),
      expect.objectContaining({ type: 'lte', field: 'created_at' }),
      expect.objectContaining({ type: 'eq', field: 'instance_id', value: 'inst-1' })
    )
  })
})
