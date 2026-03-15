'use client'

import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  icon?: React.ReactNode
}

export function EmptyState({ title, description, actionLabel, actionHref, icon }: EmptyStateProps) {
  return (
    <div className="float-in flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
      {icon && <div className="rounded-2xl bg-accent p-4 text-muted-foreground">{icon}</div>}
      <div className="space-y-1.5">
        <h3 className="text-xl font-medium">{title}</h3>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={buttonVariants({ className: 'h-10 rounded-xl px-4' })}>
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
