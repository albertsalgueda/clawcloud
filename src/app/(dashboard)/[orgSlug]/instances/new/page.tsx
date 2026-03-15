import { CreateInstanceForm } from '@/components/instances/create-instance-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewInstancePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-6">
      <section className="float-in space-y-3">
        <Link
          href={`/${orgSlug}/instances`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to instances
        </Link>
        <div className="eyebrow">Provision</div>
        <h1 className="hero-title">Create instance</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Choose a plan and region, then deploy a new managed OpenClaw environment.
        </p>
      </section>
      <section className="float-in rounded-3xl border border-border bg-card p-6 sm:p-8">
        <CreateInstanceForm />
      </section>
    </div>
  )
}
