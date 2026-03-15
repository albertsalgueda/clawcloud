import { Badge } from '@/components/ui/badge'
import type { InstanceStatus } from '@/types/instance'
import { cn } from '@/lib/utils'

const statusConfig: Record<InstanceStatus, { label: string; className: string }> = {
  pending_payment: { label: 'Awaiting Payment', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  provisioning: { label: 'Provisioning', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  running: { label: 'Running', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  stopped: { label: 'Stopped', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  error: { label: 'Error', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  deleting: { label: 'Deleting', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  deleted: { label: 'Deleted', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

export function InstanceStatusBadge({ status }: { status: InstanceStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      <span className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', {
        'bg-blue-500 animate-pulse': status === 'pending_payment',
        'bg-yellow-500 animate-pulse': status === 'provisioning',
        'bg-green-500': status === 'running',
        'bg-gray-400': status === 'stopped' || status === 'deleted',
        'bg-red-500': status === 'error',
        'bg-orange-500 animate-pulse': status === 'deleting',
      })} />
      {config.label}
    </Badge>
  )
}
