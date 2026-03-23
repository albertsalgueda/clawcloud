import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkInstanceHealth } from '@/lib/openclaw/health'
import { createDnsRecord, isDnsConfigured } from '@/lib/dns/cloudflare'
import { logInstanceEvent } from '@/lib/control-plane'

const INSTANCE_DOMAIN = process.env.INSTANCE_DOMAIN ?? 'agentcomputers.app'

async function isDashboardReachable(url: string): Promise<boolean> {
  try {
    await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000), redirect: 'follow' })
    return true
  } catch {
    return false
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const { org } = await requireAuth()

  const { data: instance } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('org_id', org.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  if (!instance.ip_address) {
    return NextResponse.json({ health: { status: 'unreachable', latency_ms: 0 } })
  }

  const health = await checkInstanceHealth(instance.ip_address)

  const updates: Record<string, unknown> = {
    last_health_check: new Date().toISOString(),
  }

  if (instance.status === 'provisioning' && health.status === 'healthy') {
    updates.status = 'running'
    updates.provisioned_at = new Date().toISOString()
  }

  let dashboardReachable = false
  if (instance.dashboard_url) {
    dashboardReachable = await isDashboardReachable(instance.dashboard_url)
    if (!dashboardReachable) {
      updates.dashboard_url = null
    }
  }

  if (!instance.dashboard_url && instance.ip_address && health.status === 'healthy' && isDnsConfigured()) {
    try {
      const dns = await createDnsRecord(instance.slug, instance.ip_address)
      if (dns.success) {
        const candidateUrl = `https://${instance.slug}.${INSTANCE_DOMAIN}`
        const reachable = await isDashboardReachable(candidateUrl)
        if (reachable) {
          updates.dashboard_url = candidateUrl
          await logInstanceEvent(instanceId, 'dns_created', {
            record_id: dns.id,
            hostname: `${instance.slug}.${INSTANCE_DOMAIN}`,
            source: 'health_check_retry',
          })
        }
      }
    } catch (err) {
      console.error('DNS retry during health check failed:', err)
    }
  }

  await supabaseAdmin
    .from('instances')
    .update(updates)
    .eq('id', instanceId)

  return NextResponse.json({ health, status: updates.status ?? instance.status })
}
