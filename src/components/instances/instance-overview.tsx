'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InstanceActions } from './instance-actions'
import { InstanceStatusBadge } from './instance-status'
import { PLANS, REGIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { usePolling } from '@/hooks/use-polling'
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Copy,
  Cpu,
  Globe,
  HardDriveDownload,
  HardDriveUpload,
  Loader2,
  MemoryStick,
  PencilLine,
} from 'lucide-react'
import { toast } from 'sonner'
import type { HealthStatus } from '@/lib/openclaw/health'
import type { Instance } from '@/types/instance'

type MetricPoint = {
  timestamp: string
  value: number
}

type MetricSummary = {
  current: number
  average: number
  peak: number
  series: MetricPoint[]
}

type InstanceRealtimeMetrics = {
  updated_at: string
  range_minutes: number
  cpu: MetricSummary
  network: {
    inbound: MetricSummary
    outbound: MetricSummary
  }
  disk: {
    read_bandwidth: MetricSummary
    write_bandwidth: MetricSummary
    read_iops: MetricSummary
    write_iops: MetricSummary
  }
}

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
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            Provisioning in progress...
          </p>
          <span className="font-mono text-xs text-muted-foreground">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-yellow-500/10">
          <div
            className="h-1.5 rounded-full bg-yellow-500 transition-all duration-500"
            style={{ width: `${Math.max(10, (completedCount / steps.length) * 100)}%` }}
          />
        </div>

        <div className="space-y-1.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {step.done ? (
                <span className="text-green-500">&#10003;</span>
              ) : i === currentIdx ? (
                <span className="animate-pulse text-yellow-500">&#9679;</span>
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

function MetricSparkline({ series }: { series: MetricPoint[] }) {
  if (series.length === 0) {
    return <div className="h-14 rounded-xl bg-muted/30" />
  }

  const width = 240
  const height = 56
  const values = series.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = series
    .map((point, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width
      const y = height - ((point.value - min) / range) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full overflow-visible">
      <line x1="0" y1={height - 4} x2={width} y2={height - 4} stroke="currentColor" opacity="0.12" />
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function formatCpuPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatBytesRate(value: number) {
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let amount = value
  let unit = units[0]

  for (let i = 0; i < units.length - 1 && amount >= 1024; i += 1) {
    amount /= 1024
    unit = units[i + 1]
  }

  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${unit}`
}

function formatIops(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)} IOPS`
}

function formatMetricTime(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

function LiveMetricCard({
  title,
  icon,
  metric,
  valueFormatter,
  detail,
}: {
  title: string
  icon: ReactNode
  metric: MetricSummary
  valueFormatter: (value: number) => string
  detail: string
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{valueFormatter(metric.current)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-primary">
          <MetricSparkline series={metric.series} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Avg {valueFormatter(metric.average)}</span>
          <span>Peak {valueFormatter(metric.peak)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{detail}</p>
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

  const [name, setName] = useState(instance.name)
  const [draftName, setDraftName] = useState(instance.name)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameSaving, setRenameSaving] = useState(false)

  useEffect(() => {
    setName(instance.name)
    setDraftName(instance.name)
  }, [instance.id, instance.name])

  const shouldPollHealth = instance.status === 'running' || instance.status === 'provisioning'
  const healthInterval = instance.status === 'provisioning' ? 10000 : 30000
  const { data: healthData } = usePolling<{ health: HealthStatus; status?: string }>(
    shouldPollHealth && instance.ip_address ? `/api/health/${instance.id}` : null,
    healthInterval
  )

  const { data: metricsData } = usePolling<{ metrics: InstanceRealtimeMetrics | null }>(
    instance.status === 'running' && instance.hetzner_server_id ? `/api/instances/${instance.id}/metrics` : null,
    30000
  )

  async function handleRename() {
    const nextName = draftName.trim()
    if (nextName.length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }

    setRenameSaving(true)
    try {
      const res = await fetch(`/api/instances/${instance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update name')
        return
      }

      setName(data.instance?.name ?? nextName)
      setDraftName(data.instance?.name ?? nextName)
      setRenameOpen(false)
      toast.success('Instance name updated')
    } catch {
      toast.error('Failed to update name')
    } finally {
      setRenameSaving(false)
    }
  }

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <Button variant="ghost" size="icon-sm" onClick={() => setRenameOpen(true)} aria-label="Rename instance">
              <PencilLine className="h-4 w-4" />
            </Button>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{instance.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <InstanceActions instance={instance} />
        </div>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename instance</DialogTitle>
            <DialogDescription>
              Update the display name shown across the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Instance name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, spaces, and dashes only.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renameSaving}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={renameSaving || draftName.trim() === name}>
              {renameSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {metricsData?.metrics && (
        <section className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Live Hetzner metrics</h2>
              <p className="text-sm text-muted-foreground">
                Last {metricsData.metrics.range_minutes} minutes, refreshed every 30 seconds.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Updated {formatMetricTime(metricsData.metrics.updated_at)}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LiveMetricCard
              title="CPU usage"
              icon={<Activity className="h-4 w-4" />}
              metric={metricsData.metrics.cpu}
              valueFormatter={formatCpuPercent}
              detail="Current and trailing average from Hetzner's server metrics API."
            />
            <LiveMetricCard
              title="Network ingress"
              icon={<ArrowDownLeft className="h-4 w-4" />}
              metric={metricsData.metrics.network.inbound}
              valueFormatter={formatBytesRate}
              detail="Inbound bandwidth across the last hour."
            />
            <LiveMetricCard
              title="Network egress"
              icon={<ArrowUpRight className="h-4 w-4" />}
              metric={metricsData.metrics.network.outbound}
              valueFormatter={formatBytesRate}
              detail="Outbound bandwidth across the last hour."
            />
            <Card className="border-border/70 bg-card/80">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Disk activity</CardTitle>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {formatIops(metricsData.metrics.disk.write_iops.current)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2 text-muted-foreground">
                    <HardDriveUpload className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-primary">
                  <MetricSparkline series={metricsData.metrics.disk.write_iops.series} />
                </div>
                <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-foreground">
                      <HardDriveDownload className="h-3.5 w-3.5" />
                      Read bandwidth
                    </div>
                    <p>{formatBytesRate(metricsData.metrics.disk.read_bandwidth.current)}</p>
                    <p>Peak {formatBytesRate(metricsData.metrics.disk.read_bandwidth.peak)}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-foreground">
                      <HardDriveUpload className="h-3.5 w-3.5" />
                      Write bandwidth
                    </div>
                    <p>{formatBytesRate(metricsData.metrics.disk.write_bandwidth.current)}</p>
                    <p>Peak {formatBytesRate(metricsData.metrics.disk.write_bandwidth.peak)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Read IOPS {formatIops(metricsData.metrics.disk.read_iops.current)}. Peak write IOPS {formatIops(metricsData.metrics.disk.write_iops.peak)}.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  )
}
