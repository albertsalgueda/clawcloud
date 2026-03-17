import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HetznerApiError } from './types'

const mockHetznerFetch = vi.fn()

vi.mock('./client', () => ({
  hetznerFetch: (...args: unknown[]) => mockHetznerFetch(...args),
}))

import { createServer, deleteServer, getServer, serverAction } from './servers'

function makeServer(id: number, location: string) {
  return {
    id,
    name: 'clawcloud-demo',
    status: 'running',
    public_net: {
      ipv4: { ip: '1.2.3.4' },
      ipv6: { ip: '::1' },
    },
    server_type: {
      name: 'cx23',
      description: 'Starter',
      cores: 2,
      memory: 4,
      disk: 40,
    },
    datacenter: {
      name: `${location}-dc`,
      location: {
        name: location,
        city: 'Test City',
        country: 'DE',
      },
    },
    labels: { location },
    created: '2026-03-17T00:00:00Z',
  }
}

describe('hetzner server helpers', () => {
  const params = {
    name: 'demo',
    serverType: 'cx23',
    location: 'fsn1',
    image: 'ubuntu-24.04',
    sshKeys: ['ssh-key-1'],
    userData: '#cloud-config',
    labels: { org_id: 'org-1' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a server in the requested location first', async () => {
    mockHetznerFetch.mockResolvedValue({ server: makeServer(1, 'fsn1') })

    await expect(createServer(params)).resolves.toEqual(makeServer(1, 'fsn1'))

    expect(mockHetznerFetch).toHaveBeenCalledWith('/servers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'demo',
        server_type: 'cx23',
        location: 'fsn1',
        image: 'ubuntu-24.04',
        ssh_keys: ['ssh-key-1'],
        user_data: '#cloud-config',
        labels: { org_id: 'org-1', location: 'fsn1' },
        start_after_create: true,
      }),
    })
  })

  it('falls back to another location after a capacity error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    mockHetznerFetch
      .mockRejectedValueOnce(new HetznerApiError(412, { error: { code: 'resource_unavailable' } }))
      .mockResolvedValueOnce({ server: makeServer(2, 'hel1') })

    await expect(createServer({ ...params, location: 'fsn1' })).resolves.toEqual(makeServer(2, 'hel1'))

    expect(console.warn).toHaveBeenCalledWith('Location fsn1 unavailable for cx23, trying next...')
    expect(console.log).toHaveBeenCalledWith(
      'Server created in fallback location hel1 (fsn1 unavailable)'
    )
  })

  it('rethrows a non-capacity error immediately', async () => {
    const error = new HetznerApiError(401, { error: { code: 'unauthorized' } })
    mockHetznerFetch.mockRejectedValue(error)

    await expect(createServer(params)).rejects.toBe(error)
    expect(mockHetznerFetch).toHaveBeenCalledTimes(1)
  })

  it('deletes, fetches, and performs actions on servers', async () => {
    mockHetznerFetch
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ server: makeServer(3, 'fsn1') })
      .mockResolvedValueOnce(undefined)

    await expect(deleteServer(3)).resolves.toBeUndefined()
    await expect(getServer(3)).resolves.toEqual(makeServer(3, 'fsn1'))
    await expect(serverAction(3, 'shutdown')).resolves.toBeUndefined()

    expect(mockHetznerFetch).toHaveBeenNthCalledWith(1, '/servers/3', { method: 'DELETE' })
    expect(mockHetznerFetch).toHaveBeenNthCalledWith(2, '/servers/3')
    expect(mockHetznerFetch).toHaveBeenNthCalledWith(3, '/servers/3/actions/shutdown', {
      method: 'POST',
    })
  })
})
