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
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border/60 p-8 text-center">
      {icon && <div className="rounded-xl bg-muted/50 p-4 text-muted-foreground">{icon}</div>}
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
