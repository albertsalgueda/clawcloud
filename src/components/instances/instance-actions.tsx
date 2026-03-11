'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'
import { Play, Square, RotateCcw, Trash2, Loader2 } from 'lucide-react'
import type { Instance } from '@/types/instance'

export function InstanceActions({ instance }: { instance: Instance }) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleAction(action: 'start' | 'stop' | 'restart') {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/instances/${instance.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? `Failed to ${action}`)
        return
      }
      toast.success(`Instance ${action === 'restart' ? 'restarted' : action === 'start' ? 'started' : 'stopped'}`)
      router.refresh()
    } catch {
      toast.error(`Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/instances/${instance.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        toast.error('Failed to delete instance')
        return
      }
      toast.success('Instance deleted')
      router.push('/instances')
      router.refresh()
    } catch {
      toast.error('Failed to delete instance')
    } finally {
      setDeleteLoading(false)
      setDeleteOpen(false)
    }
  }

  const isActionable = instance.status === 'running' || instance.status === 'stopped'

  return (
    <div className="flex flex-wrap gap-2">
      {instance.status === 'stopped' && (
        <Button size="sm" onClick={() => handleAction('start')} disabled={!!actionLoading}>
          {actionLoading === 'start' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Start
        </Button>
      )}
      {instance.status === 'running' && (
        <>
          <Button size="sm" variant="secondary" onClick={() => handleAction('stop')} disabled={!!actionLoading}>
            {actionLoading === 'stop' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
            Stop
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleAction('restart')} disabled={!!actionLoading}>
            {actionLoading === 'restart' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            Restart
          </Button>
        </>
      )}
      {isActionable && (
        <>
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)} disabled={!!actionLoading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete Instance"
            description={`This will permanently delete "${instance.name}" and cancel its subscription. This action cannot be undone.`}
            confirmLabel="Delete Instance"
            onConfirm={handleDelete}
            loading={deleteLoading}
            destructive
          />
        </>
      )}
    </div>
  )
}
