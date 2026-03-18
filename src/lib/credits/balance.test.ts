import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockExecute = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  organizations: { credit_balance_eur: 'credit_balance_eur', id: 'id' },
  creditTransactions: {},
}))

import { getBalance, checkSufficientBalance, deductCredits, addCredits } from './balance'

function mockSelectChain(balance: string) {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.limit = vi.fn(() => Promise.resolve([{ balance }]))
  return chain
}

describe('getBalance', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns the numeric balance', async () => {
    mockSelect.mockReturnValue(mockSelectChain('15.500000'))
    const balance = await getBalance('org-1')
    expect(balance).toBe(15.5)
  })

  it('returns 0 when no org found', async () => {
    const chain: Record<string, unknown> = {}
    chain.from = vi.fn(() => chain)
    chain.where = vi.fn(() => chain)
    chain.limit = vi.fn(() => Promise.resolve([]))
    mockSelect.mockReturnValue(chain)

    const balance = await getBalance('nonexistent')
    expect(balance).toBe(0)
  })
})

describe('checkSufficientBalance', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns true when balance exceeds estimated cost', async () => {
    mockSelect.mockReturnValue(mockSelectChain('10.000000'))
    const result = await checkSufficientBalance('org-1', 0.001)
    expect(result).toBe(true)
  })

  it('returns false when balance is below estimated cost', async () => {
    mockSelect.mockReturnValue(mockSelectChain('0.000000'))
    const result = await checkSufficientBalance('org-1', 0.001)
    expect(result).toBe(false)
  })
})

describe('deductCredits', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns success with new balance when deduction succeeds', async () => {
    mockExecute.mockResolvedValue([{ balance_after_eur: '9.500000' }])

    const result = await deductCredits('org-1', 0.5, {
      instanceId: 'inst-1',
      model: 'anthropic/claude-sonnet-4-5',
      inputTokens: 100,
      outputTokens: 50,
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe(9.5)
  })

  it('returns failure when balance is insufficient', async () => {
    mockExecute.mockResolvedValue([])
    mockSelect.mockReturnValue(mockSelectChain('0.000000'))

    const result = await deductCredits('org-1', 100, {
      instanceId: 'inst-1',
      model: 'anthropic/claude-sonnet-4-5',
      inputTokens: 100,
      outputTokens: 50,
    })

    expect(result.success).toBe(false)
    expect(result.newBalance).toBe(0)
  })

  it('rejects non-positive amounts', async () => {
    mockSelect.mockReturnValue(mockSelectChain('10.000000'))

    const result = await deductCredits('org-1', 0, {
      instanceId: 'inst-1',
      model: 'test',
      inputTokens: 0,
      outputTokens: 0,
    })

    expect(result.success).toBe(false)
    expect(mockExecute).not.toHaveBeenCalled()
  })
})

describe('addCredits', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns new balance after adding credits', async () => {
    mockExecute.mockResolvedValue([{ balance_after_eur: '25.000000' }])

    const balance = await addCredits('org-1', 20, {
      stripePaymentIntentId: 'pi_123',
      description: 'Test top-up',
    })

    expect(balance).toBe(25)
  })

  it('rejects non-positive amounts', async () => {
    mockSelect.mockReturnValue(mockSelectChain('5.000000'))

    const balance = await addCredits('org-1', 0)
    expect(balance).toBe(5)
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
