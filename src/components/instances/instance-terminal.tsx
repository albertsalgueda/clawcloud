'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Terminal, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Instance } from '@/types/instance'

export function InstanceTerminal({ instance }: { instance: Instance }) {
  const [consoleUrl, setConsoleUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (instance.status !== 'running' && instance.status !== 'provisioning') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
        <Terminal className="h-10 w-10 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          Instance is not running. Start it to access the terminal.
        </p>
      </div>
    )
  }

  async function requestConsole() {
    setLoading(true)
    try {
      const res = await fetch(`/api/instances/${instance.id}/console`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to open console')
        return
      }
      setConsoleUrl(data.consoleUrl)
    } catch {
      toast.error('Failed to open console')
    } finally {
      setLoading(false)
    }
  }

  if (!consoleUrl) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center space-y-4">
        <Terminal className="h-10 w-10 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium">Server Console</p>
          <p className="text-xs text-muted-foreground mt-1">
            Open a direct console session to your instance via the Hetzner VNC console.
          </p>
        </div>
        <Button onClick={requestConsole} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Terminal className="mr-2 h-4 w-4" />}
          Open Console
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Server Console (VNC)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={requestConsole} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Reconnect
          </Button>
          <a href={consoleUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" nativeButton={false}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in new tab
            </Button>
          </a>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={consoleUrl}
          className="h-[calc(100vh-220px)] w-full"
          title="Server Console"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
