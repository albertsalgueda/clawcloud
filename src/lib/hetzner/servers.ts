import { hetznerFetch } from './client'
import type { HetznerServer } from './types'
import { HetznerApiError } from './types'

interface CreateServerParams {
  name: string
  serverType: string
  location: string
  image: string
  sshKeys: string[]
  userData: string
  labels: Record<string, string>
}

const FALLBACK_LOCATIONS = ['hel1', 'fsn1', 'nbg1']

export async function createServer(params: CreateServerParams): Promise<HetznerServer> {
  const locations = [params.location, ...FALLBACK_LOCATIONS.filter(l => l !== params.location)]

  for (const location of locations) {
    try {
      const result = await hetznerFetch<{ server: HetznerServer }>('/servers', {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          server_type: params.serverType,
          location,
          image: params.image,
          ssh_keys: params.sshKeys,
          user_data: params.userData,
          labels: { ...params.labels, location },
          start_after_create: true,
        }),
      })
      if (location !== params.location) {
        console.log(`Server created in fallback location ${location} (${params.location} unavailable)`)
      }
      return result.server
    } catch (err) {
      const isCapacity = err instanceof HetznerApiError && err.status === 412
      if (!isCapacity || location === locations[locations.length - 1]) {
        throw err
      }
      console.warn(`Location ${location} unavailable for ${params.serverType}, trying next...`)
    }
  }

  throw new HetznerApiError(412, { error: { code: 'resource_unavailable', message: 'All locations exhausted' } })
}

export async function deleteServer(serverId: number): Promise<void> {
  await hetznerFetch(`/servers/${serverId}`, { method: 'DELETE' })
}

export async function getServer(serverId: number): Promise<HetznerServer> {
  return hetznerFetch<{ server: HetznerServer }>(`/servers/${serverId}`)
    .then(r => r.server)
}

export async function serverAction(
  serverId: number,
  action: 'poweron' | 'shutdown' | 'reset'
): Promise<void> {
  await hetznerFetch(`/servers/${serverId}/actions/${action}`, { method: 'POST' })
}
