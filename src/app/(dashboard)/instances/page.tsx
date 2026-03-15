import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { InstanceCard } from '@/components/instances/instance-card'
import { EmptyState } from '@/components/shared/empty-state'
import { NewInstanceLink } from '@/components/instances/new-instance-link'
import { Server } from 'lucide-react'

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
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="float-in space-y-3 pt-6">
          <div className="eyebrow">Workspace</div>
          <h1 className="hero-title">Instances</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Create and manage OpenClaw environments from a single workspace.
          </p>
        </section>
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
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="float-in flex flex-col gap-6 pt-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="eyebrow">Workspace</div>
          <h1 className="hero-title">Instances</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep infrastructure, status, and cost-visible decisions in one clean view.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:w-auto">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="mt-1 text-xl font-medium">{instances.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs text-muted-foreground">Plans</div>
            <div className="mt-1 text-xl font-medium">{new Set(instances.map((instance) => instance.plan)).size}</div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-xs text-muted-foreground">Latest</div>
            <div className="mt-1 truncate text-sm font-medium">{instances[0]?.name}</div>
          </div>
        </div>
      </section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Fleet</div>
          <div className="text-sm text-muted-foreground">Provisioned environments and their current state.</div>
        </div>
        <NewInstanceLink />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {instances.map((instance) => (
          <InstanceCard key={instance.id} instance={instance} />
        ))}
      </div>
    </div>
  )
}
