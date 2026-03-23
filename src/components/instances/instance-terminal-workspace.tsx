'use client'

import { useState } from 'react'
import {
  ExternalLink,
  Globe,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getInstanceTerminalConnection } from '@/lib/terminal'
import type { Instance } from '@/types/instance'

interface InstanceTerminalWorkspaceProps {
  instance: Instance
  className?: string
  showHero?: boolean
  showSummaryCards?: boolean
}

interface TerminalSession {
  id: string
  title: string
  version: number
}

function createSession(index: number): TerminalSession {
  return {
    id: `terminal-${index}`,
    title: `Terminal ${index}`,
    version: 0,
  }
}

function TerminalStateCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[28rem] items-center justify-center rounded-[1.75rem] border border-border/70 bg-card/70 p-8 text-center">
      <div className="max-w-md space-y-4">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background">
          <TerminalSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  )
}

function getEndpointLabel(url: string | null): string {
  if (!url) return 'Unavailable'

  try {
    const parsed = new URL(url)
    return `${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`
  } catch {
    return url
  }
}

export function InstanceTerminalWorkspace({
  instance,
  className,
  showHero = true,
  showSummaryCards = true,
}: InstanceTerminalWorkspaceProps) {
  const connection = getInstanceTerminalConnection(instance)
  const [sessions, setSessions] = useState<TerminalSession[]>([createSession(1)])
  const [activeSessionId, setActiveSessionId] = useState('terminal-1')
  const [nextSessionNumber, setNextSessionNumber] = useState(2)
  const [loadedSessions, setLoadedSessions] = useState<Record<string, boolean>>({})

  if (instance.status !== 'running') {
    return (
      <TerminalStateCard
        title={instance.status === 'provisioning' ? 'Terminal is coming online' : 'Instance is not running'}
        description={
          instance.status === 'provisioning'
            ? 'Provisioning is still in progress. As soon as the instance finishes bootstrapping, the embedded workspace will appear here.'
            : 'Start the instance to open live terminal sessions inside the app.'
        }
      />
    )
  }

  if (!connection.preferredUrl) {
    return (
      <TerminalStateCard
        title="No terminal endpoint yet"
        description="This instance does not have a reachable terminal address yet. Wait for the IP and dashboard domain to be assigned, then refresh the page."
      />
    )
  }

  const terminalUrl = connection.preferredUrl
  const activeSession = (sessions.find((session) => session.id === activeSessionId) ??
    sessions[0]) as TerminalSession
  const directEmbedWarning = connection.mode === 'direct'

  function createNewSession() {
    const session = createSession(nextSessionNumber)
    setSessions((current) => [...current, session])
    setActiveSessionId(session.id)
    setNextSessionNumber((current) => current + 1)
    setLoadedSessions((current) => ({
      ...current,
      [session.id]: false,
    }))
  }

  function reloadSession(sessionId: string) {
    setLoadedSessions((current) => ({
      ...current,
      [sessionId]: false,
    }))
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, version: session.version + 1 }
          : session,
      ),
    )
  }

  function closeSession(sessionId: string) {
    if (sessions.length === 1) return

    const closingIndex = sessions.findIndex((session) => session.id === sessionId)
    const remainingSessions = sessions.filter((session) => session.id !== sessionId)
    setSessions(remainingSessions)
    setLoadedSessions((current) => {
      const next = { ...current }
      delete next[sessionId]
      return next
    })

    if (activeSessionId === sessionId) {
      const fallbackSession = remainingSessions[Math.max(closingIndex - 1, 0)] ?? remainingSessions[0]
      setActiveSessionId(fallbackSession.id)
    }
  }

  return (
    <section className={cn('flex min-h-[calc(100dvh-12rem)] flex-col gap-4', className)}>
      {showHero && (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/80 p-5 backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_55%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_45%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  Multi-session terminal
                </Badge>
                <Badge variant="secondary">
                  {connection.mode === 'proxied' ? 'Embedded via instance domain' : 'Direct ttyd fallback'}
                </Badge>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight">Command workspace</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Keep one shell for the app, one for logs, and one for experiments without leaving the instance page.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => reloadSession(activeSession.id)}>
                <RefreshCw className="h-4 w-4" />
                Reload active tab
              </Button>
              <Button size="sm" onClick={createNewSession}>
                <Plus className="h-4 w-4" />
                New terminal
              </Button>
              <a
                href={connection.preferredUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ExternalLink className="h-4 w-4" />
                Open current endpoint
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-900/80 bg-[#050816] shadow-[0_28px_80px_-42px_rgba(2,6,23,0.96)]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(5,8,22,0.98))] px-4 py-4 text-slate-50 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
                  <TerminalSquare className="h-3.5 w-3.5 text-emerald-300" />
                  Embedded shell workspace
                </div>
                <h3 className="text-lg font-semibold tracking-tight">Live tabs stay mounted while you switch</h3>
                <p className="max-w-2xl text-sm text-slate-400">
                  Each tab keeps its own running terminal view, so you can bounce between sessions without losing context.
                </p>
              </div>
            </div>

            {!showHero && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reloadSession(activeSession.id)}
                  className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload active tab
                </Button>
                <Button
                  size="sm"
                  onClick={createNewSession}
                  className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                >
                  <Plus className="h-4 w-4" />
                  New terminal
                </Button>
                <a
                  href={connection.preferredUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white',
                  })}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open current endpoint
                </a>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSession.id

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        'group flex min-w-[13rem] items-center gap-2 rounded-2xl border px-3 py-2 transition-all',
                        isActive
                          ? 'border-emerald-300/30 bg-emerald-300/10 text-white shadow-[0_12px_30px_-24px_rgba(110,231,183,0.9)]'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSessionId(session.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span
                          className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            isActive ? 'bg-emerald-300' : 'bg-slate-500',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{session.title}</p>
                          <p className="truncate text-xs text-slate-400">
                            {isActive ? 'Active session' : 'Ready in the background'}
                          </p>
                        </div>
                      </button>

                      {sessions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => closeSession(session.id)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-100"
                          aria-label={`Close ${session.title}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  {connection.mode === 'proxied' ? 'Proxied embed' : 'Direct port access'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Globe className="h-3.5 w-3.5 text-sky-300" />
                  {sessions.length} live {sessions.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            </div>

            {directEmbedWarning && (
              <p className="text-xs text-amber-200/80">
                This instance is still using the raw terminal port. Inside an HTTPS app, some browsers may be stricter with direct `http://` embeds, so the external link is the safest fallback until the instance domain is ready.
              </p>
            )}
          </div>
        </div>

        <div className="relative min-h-[calc(100dvh-24rem)] bg-[#050816]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-slate-950/55 to-transparent" />

          {sessions.map((session) => {
            const isActive = session.id === activeSession.id
            const isLoaded = loadedSessions[session.id] ?? false

            return (
              <div
                key={session.id}
                className={cn(
                  'absolute inset-0 transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                {!isLoaded && isActive && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#050816]/88 backdrop-blur-sm">
                    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200 shadow-lg shadow-slate-950/30">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Connecting {session.title.toLowerCase()}...
                    </div>
                  </div>
                )}

                <iframe
                  key={`${session.id}:${session.version}`}
                  src={terminalUrl}
                  title={session.title}
                  className="block h-full w-full bg-transparent"
                  allow="clipboard-read; clipboard-write; fullscreen"
                  onLoad={() =>
                    setLoadedSessions((current) => ({
                      ...current,
                      [session.id]: true,
                    }))
                  }
                />
              </div>
            )
          })}
        </div>
      </div>

      {showSummaryCards && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Sessions</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{sessions.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Leave separate shells open for the server, logs, git, or one-off debugging.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Endpoint</p>
            <p className="mt-3 text-base font-semibold tracking-tight">{getEndpointLabel(connection.preferredUrl)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {connection.mode === 'proxied'
                ? 'The embed runs through the instance domain so it behaves properly inside the app.'
                : 'The embed is using the direct ttyd port until the instance domain is available.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Escape hatch</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={connection.preferredUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ExternalLink className="h-4 w-4" />
                Open current
              </a>
              {connection.proxiedUrl && connection.directUrl && (
                <a
                  href={connection.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open direct port
                </a>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Jump out to the native terminal page any time if you need a dedicated browser tab.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
