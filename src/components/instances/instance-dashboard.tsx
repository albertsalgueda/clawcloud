'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Instance } from '@/types/instance'

type DashboardView = 'clawport' | 'control-ui'

export function InstanceDashboard({ instance }: { instance: Instance }) {
  const [view, setView] = useState<DashboardView>('clawport')

  if (instance.status !== 'running' || !instance.ip_address) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">
          {instance.status === 'provisioning'
            ? 'Dashboard will be available once provisioning completes...'
            : 'Instance is not running. Start it to access the dashboard.'}
        </p>
      </div>
    )
  }

  const clawportUrl = `http://${instance.ip_address}:3000`
  const controlUiUrl = `http://${instance.ip_address}:18789`
  const currentUrl = view === 'clawport' ? clawportUrl : controlUiUrl

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setView('clawport')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              view === 'clawport'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            ClawPort
          </button>
          <button
            onClick={() => setView('control-ui')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              view === 'control-ui'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            OpenClaw Control UI
          </button>
        </div>
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </a>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          key={view}
          src={currentUrl}
          className="h-[calc(100vh-220px)] w-full"
          title={view === 'clawport' ? 'ClawPort Dashboard' : 'OpenClaw Control UI'}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
