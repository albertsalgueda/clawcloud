import type { Instance } from '@/types/instance'

export type TerminalAccessMode = 'proxied' | 'direct' | 'unavailable'

export interface TerminalConnection {
  preferredUrl: string | null
  proxiedUrl: string | null
  directUrl: string | null
  mode: TerminalAccessMode
}

type TerminalInstance = Pick<Instance, 'dashboard_url' | 'ip_address'>

const TERMINAL_PORT = 7681

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getInstanceTerminalConnection(
  instance: TerminalInstance,
): TerminalConnection {
  const proxiedUrl = instance.dashboard_url
    ? `${trimTrailingSlashes(instance.dashboard_url)}/terminal/`
    : null

  const directUrl = instance.ip_address
    ? `http://${instance.ip_address}:${TERMINAL_PORT}`
    : null

  if (proxiedUrl) {
    return {
      preferredUrl: proxiedUrl,
      proxiedUrl,
      directUrl,
      mode: 'proxied',
    }
  }

  if (directUrl) {
    return {
      preferredUrl: directUrl,
      proxiedUrl: null,
      directUrl,
      mode: 'direct',
    }
  }

  return {
    preferredUrl: null,
    proxiedUrl: null,
    directUrl: null,
    mode: 'unavailable',
  }
}
