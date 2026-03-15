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
    <div className="glass-panel surface-noise float-in flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-[32px] border border-dashed border-white/10 p-8 text-center">
      {icon && <div className="warm-glow rounded-[24px] bg-primary p-5 text-primary-foreground">{icon}</div>}
      <div className="space-y-1.5">
        <div className="eyebrow">Zero to live</div>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={buttonVariants({ className: 'warm-glow h-11 rounded-2xl px-5' })}>
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
