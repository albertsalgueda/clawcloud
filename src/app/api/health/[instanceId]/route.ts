import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkInstanceHealth } from '@/lib/openclaw/health'

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

  if (instance.dashboard_url) {
    const reachable = await isDashboardReachable(instance.dashboard_url)
    if (!reachable) {
      updates.dashboard_url = null
    }
  }

  await supabaseAdmin
    .from('instances')
    .update(updates)
    .eq('id', instanceId)

  return NextResponse.json({ health, status: updates.status ?? instance.status })
}
