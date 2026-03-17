export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unreachable'
  latency_ms: number
  details?: Record<string, unknown>
}

async function probe(url: string): Promise<{ ok: boolean; latency: number; body?: Record<string, unknown> }> {
  const start = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const latency = Date.now() - start
    const body = await res.json().catch(() => ({}))
    return { ok: res.ok, latency, body }
  } catch {
    return { ok: false, latency: Date.now() - start }
  }
}

export async function checkInstanceHealth(ip: string): Promise<HealthStatus> {
  const gateway = await probe(`http://${ip}:18789/healthz`)
  if (gateway.ok) {
    return { status: 'healthy', latency_ms: gateway.latency, details: { ...gateway.body, service: 'openclaw-gateway' } }
  }

  return { status: 'unreachable', latency_ms: gateway.latency }
}
