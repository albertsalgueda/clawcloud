'use client'

import { PanelTopOpen, Sparkles } from 'lucide-react'
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

  const baseUrl = instance.dashboard_url ?? `http://${instance.ip_address}`
  const dashboardUrl = instance.gateway_token
    ? `${baseUrl}/#token=${instance.gateway_token}`
    : baseUrl

  return (
    <section className="flex min-h-[calc(100dvh-12rem)] flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Embedded dashboard
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">OpenClaw Control UI</h2>
            <p className="text-sm text-muted-foreground">
              Full-size embedded view with a quick escape hatch when you want the native tab.
            </p>
          </div>
        </div>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent sm:self-start"
        >
          <PanelTopOpen className="h-4 w-4" />
          Open in new tab
        </a>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background/10 to-transparent" />
        <iframe
          src={dashboardUrl}
          className="h-full min-h-[calc(100dvh-18rem)] w-full flex-1 bg-background"
          title="OpenClaw Control UI"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </section>
  )
}
