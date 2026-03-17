'use client'

import { Terminal, ExternalLink } from 'lucide-react'
import type { Instance } from '@/types/instance'

export function InstanceTerminal({ instance }: { instance: Instance }) {
  if (instance.status !== 'running') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
        <Terminal className="h-10 w-10 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          {instance.status === 'provisioning'
            ? 'Terminal will be available once provisioning completes...'
            : 'Instance is not running. Start it to access the terminal.'}
        </p>
      </div>
    )
  }

  const terminalUrl = instance.ip_address
    ? `http://${instance.ip_address}:7681`
    : null

  if (!terminalUrl) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
        <Terminal className="h-10 w-10 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">No IP address assigned yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Web Terminal
        </p>
        <a
          href={terminalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </a>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-[#0a0a0a]">
        <iframe
          src={terminalUrl}
          className="h-[calc(100vh-220px)] w-full"
          title="Web Terminal"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
