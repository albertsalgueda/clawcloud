'use client'

import { ExternalLink, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { usePolling } from '@/hooks/use-polling'
import type { Instance } from '@/types/instance'

function buildDashboardUrl(base: string, token: string | null): string {
  return token ? `${base}/#token=${token}` : base
}

export function InstanceDashboard({ instance: initial }: { instance: Instance }) {
  const { data: polledInstance } = usePolling<{ instance: Instance }>(
    `/api/instances/${initial.id}`,
    10000,
  )
  const instance = polledInstance?.instance ?? initial

  usePolling<unknown>(
    instance.ip_address ? `/api/health/${instance.id}` : null,
    15000,
  )

  const baseUrl = instance.dashboard_url
    ?? (instance.ip_address ? `http://${instance.ip_address}` : null)
  const dashboardUrl = baseUrl
    ? buildDashboardUrl(baseUrl, instance.gateway_token)
    : null

  const [loaded, setLoaded] = useState(false)

  if (!dashboardUrl) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center rounded-xl border bg-card p-8 text-center">
        <div className="max-w-sm space-y-3">
          <h2 className="text-base font-semibold">Dashboard not available</h2>
          <p className="text-sm text-muted-foreground">
            This instance doesn&apos;t have a reachable dashboard URL yet. Wait for provisioning to complete, then refresh.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <ExternalLink className="h-4 w-4" />
          Open in new tab
        </a>
      </div>

      <div className="relative overflow-hidden rounded-xl border bg-card">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading dashboard...
            </div>
          </div>
        )}
        <iframe
          key={dashboardUrl}
          src={dashboardUrl}
          className="h-[calc(100dvh-14rem)] w-full"
          style={{ colorScheme: 'dark', background: 'var(--background, #0a0a0a)' }}
          title="OpenClaw Dashboard"
          allow="clipboard-read; clipboard-write"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  )
}
