import { CreateInstanceForm } from '@/components/instances/create-instance-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewInstancePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="float-in grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-noise rounded-[32px] border border-white/10 bg-card/60 p-6 backdrop-blur-2xl sm:p-8">
          <div className="eyebrow">Provisioning bay</div>
          <div className="mt-5 max-w-xl space-y-4">
            <h1 className="hero-title">Spin up a fresh OpenClaw instance in minutes.</h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              Choose a plan, drop it in the right region, and let ClawCloud handle the managed infrastructure layer.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Provisioning</div>
              <div className="mt-2 text-lg font-semibold">Managed</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Regions</div>
              <div className="mt-2 text-lg font-semibold">4 zones</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Billing</div>
              <div className="mt-2 text-lg font-semibold">Transparent</div>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[32px] p-6 sm:p-8">
          <div className="space-y-1">
            <Link
              href="/instances"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to instances
            </Link>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Create Instance</h2>
            <p className="text-sm text-muted-foreground">Deploy a new managed OpenClaw instance.</p>
          </div>
          <div className="mt-8">
            <CreateInstanceForm />
          </div>
        </section>
      </div>
    </div>
  )
}
