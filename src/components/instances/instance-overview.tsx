'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InstanceStatusBadge } from './instance-status'
import { InstanceActions } from './instance-actions'
import { PLANS, REGIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { usePolling } from '@/hooks/use-polling'
import { Copy, Globe, Cpu, MemoryStick, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Instance } from '@/types/instance'
import type { HealthStatus } from '@/lib/openclaw/health'

export function InstanceOverview({ instance }: { instance: Instance }) {
  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]
  const { data: healthData } = usePolling<{ health: HealthStatus }>(
    instance.status === 'running' ? `/api/health/${instance.id}` : null,
    30000
  )

  function copyIp() {
    if (instance.ip_address) {
      navigator.clipboard.writeText(instance.ip_address)
      toast.success('IP copied')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{instance.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{instance.slug}</p>
        </div>
        <InstanceActions instance={instance} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <InstanceStatusBadge status={instance.status} />
            {healthData?.health && (
              <p className="mt-2 text-xs text-muted-foreground">
                Health: {healthData.health.status} ({healthData.health.latency_ms}ms)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {instance.ip_address ? (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{instance.ip_address}</span>
                <button onClick={copyIp} className="text-muted-foreground hover:text-foreground">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Badge variant="secondary">{plan.name}</Badge>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" /> {plan.vcpu} vCPU
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MemoryStick className="h-3.5 w-3.5" /> {plan.ram_gb} GB RAM
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Region</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{region.label}</p>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Created {formatDate(instance.created_at)}
            </div>
            {instance.provisioned_at && (
              <p className="text-xs text-muted-foreground">
                Provisioned {formatDate(instance.provisioned_at)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
