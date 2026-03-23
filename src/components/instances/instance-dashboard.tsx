'use client'

import { AppWindow, PanelTopOpen, Sparkles, TerminalSquare } from 'lucide-react'
import { InstanceTerminalWorkspace } from '@/components/instances/instance-terminal-workspace'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buttonVariants } from '@/components/ui/button'
import type { Instance } from '@/types/instance'

export function InstanceDashboard({ instance }: { instance: Instance }) {
  const baseUrl = instance.dashboard_url ?? (instance.ip_address ? `http://${instance.ip_address}` : null)
  const dashboardUrl = baseUrl
    ? instance.gateway_token
      ? `${baseUrl}/#token=${instance.gateway_token}`
      : baseUrl
    : null

  return (
    <section className="flex min-h-[calc(100dvh-12rem)] flex-col gap-4">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/80 p-5 backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_52%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Embedded workspace
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Instance dashboard</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                The terminal workspace is the reliable default here, and the raw Control UI is still one click away when you need it.
              </p>
            </div>
          </div>

          {dashboardUrl && (
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <PanelTopOpen className="h-4 w-4" />
              Open Control UI
            </a>
          )}
        </div>
      </div>

      <Tabs defaultValue="terminal" className="gap-4">
        <TabsList
          variant="line"
          className="h-auto w-fit rounded-2xl border border-border/70 bg-card/70 p-1"
        >
          <TabsTrigger value="terminal" className="px-3 py-2">
            <TerminalSquare className="h-4 w-4" />
            Terminal workspace
          </TabsTrigger>
          {dashboardUrl && (
            <TabsTrigger value="control" className="px-3 py-2">
              <AppWindow className="h-4 w-4" />
              Control UI
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="terminal">
          <InstanceTerminalWorkspace
            instance={instance}
            showHero={false}
            showSummaryCards={false}
          />
        </TabsContent>

        {dashboardUrl && (
          <TabsContent value="control">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    <AppWindow className="h-3.5 w-3.5 text-primary" />
                    Raw instance UI
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">OpenClaw Control UI</h3>
                    <p className="text-sm text-muted-foreground">
                      This is the app that runs inside the instance itself. If its frontend assets are missing, the terminal workspace tab remains fully usable.
                    </p>
                  </div>
                </div>
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <PanelTopOpen className="h-4 w-4" />
                  Open in new tab
                </a>
              </div>

              <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background/10 to-transparent" />
                <iframe
                  src={dashboardUrl}
                  className="h-full min-h-[calc(100dvh-20rem)] w-full flex-1 bg-background"
                  title="OpenClaw Control UI"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </section>
  )
}
