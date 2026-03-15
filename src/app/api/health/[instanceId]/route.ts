import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkInstanceHealth } from '@/lib/openclaw/health'

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

  await supabaseAdmin
    .from('instances')
    .update({ last_health_check: new Date().toISOString() })
    .eq('id', instanceId)

  return NextResponse.json({ health })
}
