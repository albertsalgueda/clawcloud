import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { InstanceCard } from '@/components/instances/instance-card'
import { EmptyState } from '@/components/shared/empty-state'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Server } from 'lucide-react'

export default async function InstancesPage() {
  const customer = await requireAuth()

  const { data: instances } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('customer_id', customer.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (!instances?.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Instances</h1>
        </div>
        <EmptyState
          title="No instances yet"
          description="Create your first OpenClaw instance to get started."
          actionLabel="Create Instance"
          actionHref="/instances/new"
          icon={<Server className="h-12 w-12" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Instances</h1>
        <Link href="/instances/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Instance
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instances.map((instance) => (
          <InstanceCard key={instance.id} instance={instance} />
        ))}
      </div>
    </div>
  )
}
