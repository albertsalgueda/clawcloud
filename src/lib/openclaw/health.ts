export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unreachable'
  latency_ms: number
  details?: Record<string, unknown>
}

export async function checkInstanceHealth(ip: string): Promise<HealthStatus> {
  const start = Date.now()
  try {
    const res = await fetch(`http://${ip}:3000/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      return { status: 'healthy', latency_ms: latency, details: body }
    }
    return { status: 'unhealthy', latency_ms: latency }
  } catch {
    return { status: 'unreachable', latency_ms: Date.now() - start }
  }
}
