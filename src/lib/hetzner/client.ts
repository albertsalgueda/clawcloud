import { HetznerApiError } from './types'

const HETZNER_API_BASE = 'https://api.hetzner.cloud/v1'

export async function hetznerFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${HETZNER_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.HETZNER_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new HetznerApiError(res.status, body)
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
