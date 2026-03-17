import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { InstanceDashboard } from '@/components/instances/instance-dashboard'

export default async function InstanceDashboardPage({
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

  return <InstanceDashboard instance={instance} />
}
