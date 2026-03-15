import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { InstanceSettingsForm } from '@/components/instances/instance-settings-form'
import { notFound } from 'next/navigation'

export default async function InstanceSettingsPage({
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

  return (
    <div className="mx-auto max-w-2xl">
      <InstanceSettingsForm instance={instance} />
    </div>
  )
}
