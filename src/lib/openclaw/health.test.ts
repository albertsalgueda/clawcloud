import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkInstanceHealth } from './health'

const mockFetch = vi.fn()

describe('checkInstanceHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('returns a healthy status when the gateway probe succeeds', async () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1125)

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ version: '1.0.0' }),
    })

    await expect(checkInstanceHealth('1.2.3.4')).resolves.toEqual({
      status: 'healthy',
      latency_ms: 125,
      details: {
        version: '1.0.0',
        service: 'openclaw-gateway',
      },
    })
  })

  it('returns unreachable when the probe fails', async () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(2300)

    mockFetch.mockRejectedValue(new Error('network error'))

    await expect(checkInstanceHealth('1.2.3.4')).resolves.toEqual({
      status: 'unreachable',
      latency_ms: 300,
    })
  })
})
