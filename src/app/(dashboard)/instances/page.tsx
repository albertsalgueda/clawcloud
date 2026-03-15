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
      <div className="space-y-8">
        <section className="float-in flex flex-col gap-4 rounded-[32px] border border-white/10 bg-card/60 p-6 backdrop-blur-2xl sm:p-8">
          <div className="eyebrow">Control center</div>
          <div className="max-w-2xl space-y-3">
            <h1 className="hero-title">Launch your first OpenClaw environment.</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Provision a managed workspace with billing visibility, live health checks, and a dashboard that feels more like a cockpit than a control panel.
            </p>
          </div>
        </section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Instances</h2>
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
    <div className="space-y-8">
      <section className="surface-noise float-in overflow-hidden rounded-[32px] border border-white/10 bg-card/60 p-6 backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="eyebrow">ClawCloud fleet</div>
            <div className="space-y-3">
              <h1 className="hero-title">Operate your AI infrastructure like it belongs in a sci-fi movie.</h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Track managed instances, jump into details fast, and keep provisioning flowing without losing sight of cost or capacity.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Total nodes</div>
              <div className="mt-2 text-3xl font-semibold">{instances.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Active plans</div>
              <div className="mt-2 text-3xl font-semibold">{new Set(instances.map((instance) => instance.plan)).size}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Newest launch</div>
              <div className="mt-2 text-lg font-semibold">{instances[0]?.name}</div>
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Fleet overview</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Instances</h2>
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
