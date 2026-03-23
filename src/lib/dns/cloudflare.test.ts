import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDnsRecord, deleteDnsRecord, isDnsConfigured } from './cloudflare'

const mockFetch = vi.fn()

describe('cloudflare dns helpers', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    process.env = { ...originalEnv }
    delete process.env.CLOUDFLARE_API_TOKEN
    delete process.env.CLOUDFLARE_ZONE_ID
    delete process.env.INSTANCE_DOMAIN
  })

  it('reports configuration availability from env vars', () => {
    expect(isDnsConfigured()).toBe(false)

    process.env.CLOUDFLARE_API_TOKEN = 'token'
    process.env.CLOUDFLARE_ZONE_ID = 'zone'

    expect(isDnsConfigured()).toBe(true)
  })

  it('returns an unsuccessful result when cloudflare is not configured', async () => {
    await expect(createDnsRecord('demo', '1.2.3.4')).resolves.toEqual({ success: false })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('creates a DNS record with the expected payload', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'token'
    process.env.CLOUDFLARE_ZONE_ID = 'zone'
    process.env.INSTANCE_DOMAIN = 'example.com'

    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        result: { id: 'record-123' },
      }),
    })

    await expect(createDnsRecord('demo', '1.2.3.4')).resolves.toEqual({
      success: true,
      id: 'record-123',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/zone/dns_records',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
      })
    )
    expect(JSON.parse(mockFetch.mock.calls[0][1].body as string)).toEqual({
      type: 'A',
      name: 'demo.example.com',
      content: '1.2.3.4',
      ttl: 1,
      proxied: true,
    })
  })

  it('falls back to the default instance domain when none is configured', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'token'
    process.env.CLOUDFLARE_ZONE_ID = 'zone'

    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        result: { id: 'record-123' },
      }),
    })

    await createDnsRecord('demo', '1.2.3.4')

    expect(JSON.parse(mockFetch.mock.calls[0][1].body as string)).toEqual(
      expect.objectContaining({
        name: 'demo.agentcomputers.app',
      })
    )
  })

  it('skips delete when configuration is missing', async () => {
    await deleteDnsRecord('record-123')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('deletes a DNS record when configured', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'token'
    process.env.CLOUDFLARE_ZONE_ID = 'zone'
    mockFetch.mockResolvedValue({})

    await deleteDnsRecord('record-123')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/zone/dns_records/record-123',
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token' },
      }
    )
  })
})
