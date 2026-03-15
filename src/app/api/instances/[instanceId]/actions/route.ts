import { NextResponse } from 'next/server'
import { requireAuth, canManageInstance } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { serverAction } from '@/lib/hetzner/servers'
import { logInstanceEvent } from '@/lib/control-plane'
import { z } from 'zod'

const actionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart']),
})

const ACTION_MAP = {
  start: 'poweron',
  stop: 'shutdown',
  restart: 'reset',
} as const

const STATUS_MAP = {
  start: 'running',
  stop: 'stopped',
  restart: 'running',
} as const

export async function POST(
  req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const { org, membership } = await requireAuth()
  const body = await req.json()

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { action } = parsed.data

  const { data: instance } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('org_id', org.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  if (!canManageInstance(membership, instance)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (!instance.hetzner_server_id) {
    return NextResponse.json({ error: 'Instance has no server' }, { status: 400 })
  }

  if (instance.status === 'provisioning' || instance.status === 'deleting') {
    return NextResponse.json({ error: `Cannot ${action} instance in ${instance.status} state` }, { status: 400 })
  }

  try {
    await serverAction(instance.hetzner_server_id, ACTION_MAP[action])
  } catch (err) {
    console.error(`Server action ${action} failed:`, err)
    return NextResponse.json({ error: `Failed to ${action} instance` }, { status: 500 })
  }

  const newStatus = STATUS_MAP[action]
  const { data: updated } = await supabaseAdmin
    .from('instances')
    .update({ status: newStatus })
    .eq('id', instanceId)
    .select()
    .single()

  await logInstanceEvent(instanceId, action === 'restart' ? 'restarted' : action === 'start' ? 'started' : 'stopped', {})

  return NextResponse.json({ instance: updated })
}
