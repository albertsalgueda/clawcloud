import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreate = vi.fn()

vi.mock('./client', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  },
}))

import { createPortalSession } from './portal'

describe('createPortalSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a Stripe billing portal session and returns its URL', async () => {
    mockCreate.mockResolvedValue({ url: 'https://billing.example/session' })

    await expect(
      createPortalSession('cus_123', 'https://app.example/settings')
    ).resolves.toBe('https://billing.example/session')

    expect(mockCreate).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://app.example/settings',
    })
  })
})
