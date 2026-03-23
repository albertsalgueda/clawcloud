import { NextResponse } from 'next/server'
import { requireAuth, canManageInstance } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { cancelSubscription } from '@/lib/stripe/subscriptions'
import { deleteServer } from '@/lib/hetzner/servers'
import { logInstanceEvent } from '@/lib/control-plane'
import { z } from 'zod'

const updateInstanceSchema = z.object({
  name: z.string().trim().min(2).max(50).regex(/^[a-zA-Z0-9\s-]+$/).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  env_vars: z.record(z.string(), z.string()).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const { profile, org, membership } = await requireAuth()

  const { data: instance, error } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('org_id', org.id)
    .single()

  if (error || !instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  if (membership.role === 'member' && instance.created_by !== profile.id) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  return NextResponse.json({ instance })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const { org, membership } = await requireAuth()
  const body = await req.json()
  const parsed = updateInstanceSchema.safeParse(body)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const msg = Object.entries(fieldErrors)
      .map(([key, value]) => `${key}: ${(value as string[]).join(', ')}`)
      .join('; ')

    return NextResponse.json({ error: msg || 'Invalid input' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('org_id', org.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  if (!canManageInstance(membership, existing)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.config !== undefined) updates.config = parsed.data.config
  if (parsed.data.env_vars !== undefined) updates.env_vars = parsed.data.env_vars

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const { data: instance, error } = await supabaseAdmin
    .from('instances')
    .update(updates)
    .eq('id', instanceId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logInstanceEvent(instanceId, 'config_updated', { updates: Object.keys(updates) })

  return NextResponse.json({ instance })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const { org, membership } = await requireAuth()

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

  await supabaseAdmin
    .from('instances')
    .update({ status: 'deleting' })
    .eq('id', instanceId)

  if (instance.stripe_subscription_id) {
    try {
      await cancelSubscription(instance.stripe_subscription_id)
    } catch (err) {
      console.error('Failed to cancel subscription:', err)
    }
  }

  if (instance.hetzner_server_id) {
    try {
      await deleteServer(instance.hetzner_server_id)
    } catch (err) {
      console.error('Failed to delete server:', err)
    }
  }

  await supabaseAdmin
    .from('instances')
    .update({ status: 'deleted' })
    .eq('id', instanceId)

  await logInstanceEvent(instanceId, 'deleted', {})

  return new NextResponse(null, { status: 204 })
}
