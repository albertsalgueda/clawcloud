export interface HetznerServer {
  id: number
  name: string
  status: string
  public_net: {
    ipv4: {
      ip: string
    }
    ipv6: {
      ip: string
    }
  }
  server_type: {
    name: string
    description: string
    cores: number
    memory: number
    disk: number
  }
  datacenter: {
    name: string
    location: {
      name: string
      city: string
      country: string
    }
  }
  labels: Record<string, string>
  created: string
}

export interface HetznerAction {
  id: number
  command: string
  status: string
  progress: number
}

export class HetznerApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(`Hetzner API error ${status}: ${JSON.stringify(body)}`)
    this.name = 'HetznerApiError'
  }
}
