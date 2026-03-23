'use client'

import { useState } from 'react'
import { ExternalLink, LoaderCircle, Plus, RefreshCw, TerminalSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInstanceTerminalConnection } from '@/lib/terminal'
import { usePolling } from '@/hooks/use-polling'
import type { Instance } from '@/types/instance'

interface InstanceTerminalWorkspaceProps {
  instance: Instance
  className?: string
}

interface TerminalSession {
  id: string
  title: string
  version: number
}

function createSession(index: number): TerminalSession {
  return { id: `terminal-${index}`, title: `Terminal ${index}`, version: 0 }
}

export function InstanceTerminalWorkspace({
  instance: initial,
  className,
}: InstanceTerminalWorkspaceProps) {
  const { data: polledInstance } = usePolling<{ instance: Instance }>(
    `/api/instances/${initial.id}`,
    10000,
  )
  const instance = polledInstance?.instance ?? initial

  usePolling<unknown>(
    instance.ip_address ? `/api/health/${instance.id}` : null,
    15000,
  )

  const connection = getInstanceTerminalConnection(instance)
  const [sessions, setSessions] = useState<TerminalSession[]>([createSession(1)])
  const [activeSessionId, setActiveSessionId] = useState('terminal-1')
  const [nextSessionNumber, setNextSessionNumber] = useState(2)
  const [loadedSessions, setLoadedSessions] = useState<Record<string, boolean>>({})

  if (instance.status !== 'running') {
    return (
      <div className="flex min-h-[28rem] items-center justify-center rounded-xl border bg-card p-8 text-center">
        <div className="max-w-sm space-y-3">
          <TerminalSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="text-base font-semibold">
            {instance.status === 'provisioning' ? 'Terminal is coming online' : 'Instance is not running'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {instance.status === 'provisioning'
              ? 'Provisioning is still in progress. The terminal will appear once the instance finishes bootstrapping.'
              : 'Start the instance to open a terminal session.'}
          </p>
        </div>
      </div>
    )
  }

  if (!connection.preferredUrl) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center rounded-xl border bg-card p-8 text-center">
        <div className="max-w-sm space-y-3">
          <TerminalSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="text-base font-semibold">No terminal endpoint yet</h2>
          <p className="text-sm text-muted-foreground">
            Waiting for the instance to get a reachable address. Refresh the page once it&apos;s assigned.
          </p>
        </div>
      </div>
    )
  }

  const terminalUrl = connection.preferredUrl
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]

  function createNewSession() {
    const session = createSession(nextSessionNumber)
    setSessions((prev) => [...prev, session])
    setActiveSessionId(session.id)
    setNextSessionNumber((n) => n + 1)
    setLoadedSessions((prev) => ({ ...prev, [session.id]: false }))
  }

  function reloadSession(sessionId: string) {
    setLoadedSessions((prev) => ({ ...prev, [sessionId]: false }))
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, version: s.version + 1 } : s)),
    )
  }

  function closeSession(sessionId: string) {
    if (sessions.length === 1) return
    const idx = sessions.findIndex((s) => s.id === sessionId)
    const remaining = sessions.filter((s) => s.id !== sessionId)
    setSessions(remaining)
    setLoadedSessions((prev) => {
      const next = { ...prev }
      delete next[sessionId]
      return next
    })
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[Math.max(idx - 1, 0)]?.id ?? remaining[0].id)
    }
  }

  return (
    <div className={cn('flex flex-col gap-0 overflow-hidden rounded-xl border bg-[#0a0a0a]', className)}>
      <div className="flex items-center gap-1 border-b border-white/10 bg-[#111] px-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {sessions.map((session) => {
            const isActive = session.id === activeSession.id
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  'group flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/70',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-400' : 'bg-white/30')} />
                {session.title}
                {sessions.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); closeSession(session.id) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); closeSession(session.id) } }}
                    className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
                    aria-label={`Close ${session.title}`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            )
          })}

          <button
            type="button"
            onClick={createNewSession}
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            aria-label="New terminal"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => reloadSession(activeSession.id)}
            className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            aria-label="Reload terminal"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={terminalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="relative min-h-[calc(100dvh-16rem)] bg-[#0a0a0a]">
        {sessions.map((session) => {
          const isActive = session.id === activeSession.id
          const isLoaded = loadedSessions[session.id] ?? false

          return (
            <div
              key={session.id}
              className={cn(
                'absolute inset-0 transition-opacity duration-150',
                isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {!isLoaded && isActive && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]">
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Connecting...
                  </div>
                </div>
              )}

              <iframe
                key={`${session.id}:${session.version}:${terminalUrl}`}
                src={terminalUrl}
                title={session.title}
                className="block h-full w-full"
                style={{ colorScheme: 'dark', background: '#0a0a0a' }}
                allow="clipboard-read; clipboard-write; fullscreen"
                onLoad={() => setLoadedSessions((prev) => ({ ...prev, [session.id]: true }))}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
