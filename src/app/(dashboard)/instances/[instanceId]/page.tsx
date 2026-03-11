import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { InstanceOverview } from '@/components/instances/instance-overview'
import { notFound } from 'next/navigation'

export default async function InstanceDetailPage({
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

  return <InstanceOverview instance={instance} />
}
