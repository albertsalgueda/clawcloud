'use client'

import { ExternalLink, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import type { Instance } from '@/types/instance'

const LOAD_TIMEOUT_MS = 8000

function buildDashboardUrl(base: string, token: string | null): string {
  return token ? `${base}/#token=${token}` : base
}

export function InstanceDashboard({ instance }: { instance: Instance }) {
  const httpsBase = instance.dashboard_url ?? null
  const ipBase = instance.ip_address ? `http://${instance.ip_address}` : null
  const [useFallback, setUseFallback] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const activeBase = useFallback ? (ipBase ?? httpsBase) : (httpsBase ?? ipBase)
  const dashboardUrl = activeBase
    ? buildDashboardUrl(activeBase, instance.gateway_token)
    : null

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function startLoadTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!useFallback && httpsBase && ipBase) {
      timerRef.current = setTimeout(() => {
        setUseFallback(true)
        setLoaded(false)
      }, LOAD_TIMEOUT_MS)
    }
  }

  function handleLoad() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setLoaded(true)
  }

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
          ref={(el) => { if (el) startLoadTimer() }}
          onLoad={handleLoad}
        />
      </div>
    </div>
  )
}
