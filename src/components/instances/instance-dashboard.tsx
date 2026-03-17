'use client'

import { ExternalLink } from 'lucide-react'
import type { Instance } from '@/types/instance'

export function InstanceDashboard({ instance }: { instance: Instance }) {
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

  const dashboardUrl = instance.dashboard_url
    ? `${instance.dashboard_url}/gateway`
    : `http://${instance.ip_address}:18789`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <a
          href={dashboardUrl}
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
          src={dashboardUrl}
          className="h-[calc(100vh-220px)] w-full"
          title="OpenClaw Control UI"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
