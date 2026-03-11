import { hetznerFetch } from './client'
import type { HetznerServer } from './types'

interface CreateServerParams {
  name: string
  serverType: string
  location: string
  image: string
  sshKeys: string[]
  userData: string
  labels: Record<string, string>
}

export async function createServer(params: CreateServerParams): Promise<HetznerServer> {
  return hetznerFetch<{ server: HetznerServer }>('/servers', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      server_type: params.serverType,
      location: params.location,
      image: params.image,
      ssh_keys: params.sshKeys,
      user_data: params.userData,
      labels: params.labels,
      start_after_create: true,
    }),
  }).then(r => r.server)
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
