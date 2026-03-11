import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { cancelSubscription } from '@/lib/stripe/subscriptions'
import { deleteServer } from '@/lib/hetzner/servers'
import { logInstanceEvent } from '@/lib/control-plane'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const customer = await requireAuth()

  const { data: instance, error } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('customer_id', customer.id)
    .single()

  if (error || !instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  return NextResponse.json({ instance })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const customer = await requireAuth()
  const body = await req.json()

  const { data: existing } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('customer_id', customer.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (body.name) updates.name = body.name
  if (body.config) updates.config = body.config
  if (body.env_vars) updates.env_vars = body.env_vars

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
  const customer = await requireAuth()

  const { data: instance } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('customer_id', customer.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
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
