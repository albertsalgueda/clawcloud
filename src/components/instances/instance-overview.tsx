'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InstanceStatusBadge } from './instance-status'
import { InstanceActions } from './instance-actions'
import { PLANS, REGIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { usePolling } from '@/hooks/use-polling'
import { Copy, Globe, Cpu, MemoryStick, Clock, ExternalLink } from 'lucide-react'
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

  const dashboardUrl = instance.dashboard_url
    ?? (instance.ip_address ? `http://${instance.ip_address}:3000` : null)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{instance.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{instance.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {instance.status === 'running' && dashboardUrl && (
            <Button
              render={<a href={dashboardUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Dashboard
            </Button>
          )}
          <InstanceActions instance={instance} />
        </div>
      </div>

      {instance.status === 'running' && dashboardUrl && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Agent Dashboard</p>
              <p className="text-xs text-muted-foreground">
                Chat with your agent, manage tasks, view logs, and track costs
              </p>
            </div>
            <Button
              size="sm"
              render={<a href={dashboardUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open ClawPort
            </Button>
          </CardContent>
        </Card>
      )}

      {instance.status === 'provisioning' && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              Provisioning in progress...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your server is being set up with OpenClaw and ClawPort. This usually takes 3-5 minutes.
              The dashboard will be available once provisioning completes.
            </p>
          </CardContent>
        </Card>
      )}

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
