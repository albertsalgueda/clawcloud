import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { InstanceSettingsForm } from '@/components/instances/instance-settings-form'
import { notFound } from 'next/navigation'

export default async function InstanceSettingsPage({
  params,
}: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  const customer = await requireAuth()

  const { data: instance } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('customer_id', customer.id)
    .single()

  if (!instance) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Instance Settings</h1>
      <InstanceSettingsForm instance={instance} />
    </div>
  )
}
