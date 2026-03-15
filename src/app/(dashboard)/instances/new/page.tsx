import { CreateInstanceForm } from '@/components/instances/create-instance-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewInstancePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <Link
          href="/instances"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to instances
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Instance</h1>
        <p className="text-sm text-muted-foreground">Deploy a new managed OpenClaw instance.</p>
      </div>
      <CreateInstanceForm />
    </div>
  )
}
