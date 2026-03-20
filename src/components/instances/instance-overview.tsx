'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InstanceStatusBadge } from './instance-status'
import { InstanceActions } from './instance-actions'
import { PLANS, REGIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { usePolling } from '@/hooks/use-polling'
import { useState, useEffect } from 'react'
import { Copy, Globe, Cpu, MemoryStick, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Instance } from '@/types/instance'
import type { HealthStatus } from '@/lib/openclaw/health'

function ProvisioningProgress({ instance, healthStatus }: { instance: Instance; healthStatus?: string }) {
  const steps = [
    { label: 'Server created', done: !!instance.hetzner_server_id },
    { label: 'IP address assigned', done: !!instance.ip_address },
    { label: 'DNS configured', done: !!instance.dashboard_url },
    { label: 'Installing OpenClaw & dependencies', done: healthStatus === 'healthy' },
    { label: 'Gateway online', done: healthStatus === 'healthy' },
  ]

  const completedCount = steps.filter(s => s.done).length
  const currentIdx = steps.findIndex(s => !s.done)

  const [now, setNow] = useState(() => new Date(instance.created_at).getTime())
  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()
    const id = setInterval(updateNow, 1000)
    return () => clearInterval(id)
  }, [])
  const elapsed = Math.floor((now - new Date(instance.created_at).getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            Provisioning in progress...
          </p>
          <span className="text-xs font-mono text-muted-foreground">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="w-full bg-yellow-500/10 rounded-full h-1.5">
          <div
            className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(10, (completedCount / steps.length) * 100)}%` }}
          />
        </div>

        <div className="space-y-1.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {step.done ? (
                <span className="text-green-500">&#10003;</span>
              ) : i === currentIdx ? (
                <span className="text-yellow-500 animate-pulse">&#9679;</span>
              ) : (
                <span className="text-muted-foreground/40">&#9675;</span>
              )}
              <span className={step.done ? 'text-muted-foreground' : i === currentIdx ? 'text-foreground' : 'text-muted-foreground/40'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          This usually takes 3-5 minutes. The dashboard will appear once provisioning completes.
        </p>
      </CardContent>
    </Card>
  )
}

export function InstanceOverview({ instance: initialInstance }: { instance: Instance }) {
  const isProvisioning = initialInstance.status === 'provisioning'
  const { data: polledData } = usePolling<{ instance: Instance }>(
    isProvisioning ? `/api/instances/${initialInstance.id}` : null,
    5000
  )
  const instance = polledData?.instance ?? initialInstance

  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]

  const shouldPollHealth = instance.status === 'running' || instance.status === 'provisioning'
  const healthInterval = instance.status === 'provisioning' ? 10000 : 30000
  const { data: healthData } = usePolling<{ health: HealthStatus; status?: string }>(
    shouldPollHealth && instance.ip_address ? `/api/health/${instance.id}` : null,
    healthInterval
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
          <h1 className="text-2xl font-bold tracking-tight">{instance.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{instance.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <InstanceActions instance={instance} />
        </div>
      </div>

      {instance.status === 'provisioning' && (
        <ProvisioningProgress instance={instance} healthStatus={healthData?.health?.status} />
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
