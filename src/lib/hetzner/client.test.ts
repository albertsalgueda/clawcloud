import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hetznerFetch } from './client'
import { HetznerApiError } from './types'

const mockFetch = vi.fn()

describe('hetznerFetch', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    process.env = { ...originalEnv, HETZNER_API_TOKEN: 'hetzner-token' }
  })

  it('sends auth headers and parses a JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('{"server":{"id":1}}'),
    })

    await expect(hetznerFetch('/servers')).resolves.toEqual({ server: { id: 1 } })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.hetzner.cloud/v1/servers',
      {
        headers: {
          Authorization: 'Bearer hetzner-token',
          'Content-Type': 'application/json',
        },
      }
    )
  })

  it('returns undefined when the response body is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(''),
    })

    await expect(hetznerFetch('/servers')).resolves.toBeUndefined()
  })

  it('throws HetznerApiError with the parsed error body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 412,
      json: vi.fn().mockResolvedValue({ error: { code: 'resource_unavailable' } }),
    })

    await expect(hetznerFetch('/servers')).rejects.toEqual(
      expect.objectContaining({
        name: 'HetznerApiError',
        status: 412,
        body: { error: { code: 'resource_unavailable' } },
      })
    )
  })

  it('falls back to an empty body when the error payload is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })

    await expect(hetznerFetch('/servers')).rejects.toEqual(
      expect.objectContaining({
        status: 500,
        body: {},
      })
    )
  })

  it('constructs HetznerApiError instances with a readable message', () => {
    const error = new HetznerApiError(403, { error: { code: 'forbidden' } })

    expect(error.message).toContain('Hetzner API error 403')
    expect(error.body).toEqual({ error: { code: 'forbidden' } })
  })
})
