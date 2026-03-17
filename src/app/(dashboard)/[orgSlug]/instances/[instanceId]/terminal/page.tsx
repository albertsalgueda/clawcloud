import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { InstanceTerminal } from '@/components/instances/instance-terminal'

export default async function InstanceTerminalPage({
  params,
}: {
  params: Promise<{ orgSlug: string; instanceId: string }>
}) {
  const { instanceId } = await params
  const { org } = await requireAuth()

  const { data: instance } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('org_id', org.id)
    .single()

  if (!instance) notFound()

  return <InstanceTerminal instance={instance} />
}
