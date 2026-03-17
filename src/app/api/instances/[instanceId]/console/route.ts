import { NextResponse } from 'next/server'
import { requireAuth, canManageInstance } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hetznerFetch } from '@/lib/hetzner/client'

export async function POST(
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

  if (!instance.hetzner_server_id) {
    return NextResponse.json({ error: 'Server not provisioned' }, { status: 400 })
  }

  try {
    const result = await hetznerFetch<{
      wss_url: string
      password: string
    }>(`/servers/${instance.hetzner_server_id}/actions/request_console`, {
      method: 'POST',
    })

    return NextResponse.json({
      consoleUrl: result.wss_url,
      password: result.password,
    })
  } catch (err) {
    console.error('Console request failed:', err)
    return NextResponse.json({ error: 'Failed to open console' }, { status: 500 })
  }
}
