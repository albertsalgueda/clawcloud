'use client'

import { useMemo, useState } from 'react'
import { useUsage } from '@/hooks/use-usage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Instance } from '@/types/instance'
import { formatCurrency } from '@/lib/utils'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'current', label: 'This month' },
] as const

function formatCompactDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

function formatTokenCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

function InstanceSpendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number; color?: string; name?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
      <div className="text-sm font-medium">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="mt-1 flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
          <span className="font-medium">{typeof item.value === 'number' ? formatCurrency(item.value) : '-'}</span>
        </div>
      ))}
    </div>
  )
}

function UsageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number; color?: string; name?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
      <div className="text-sm font-medium">{label ? formatCompactDate(label) : ''}</div>
      {payload.map((item) => (
        <div key={item.name} className="mt-1 flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
          <span className="font-medium">
            {item.name?.toLowerCase().includes('token') || item.name === 'Requests'
              ? formatTokenCount(Number(item.value ?? 0))
              : formatCurrency(Number(item.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

export function UsageAnalytics({ instances }: { instances: Instance[] }) {
  const [selectedInstanceId, setSelectedInstanceId] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState<(typeof PERIOD_OPTIONS)[number]['value']>('30d')
  const effectiveInstanceId = selectedInstanceId === 'all' || instances.some((instance) => instance.id === selectedInstanceId)
    ? selectedInstanceId
    : 'all'
  const { usage, isLoading } = useUsage(
    effectiveInstanceId === 'all' ? undefined : effectiveInstanceId,
    selectedPeriod,
  )

  const totals = useMemo(() => {
    const daily = usage?.daily ?? []

    return daily.reduce(
      (acc, day) => ({
        inputTokens: acc.inputTokens + day.input_tokens,
        outputTokens: acc.outputTokens + day.output_tokens,
        requests: acc.requests + day.requests,
      }),
      { inputTokens: 0, outputTokens: 0, requests: 0 },
    )
  }, [usage?.daily])

  const selectedInstance = instances.find((instance) => instance.id === effectiveInstanceId)
  const scopeLabel = selectedInstance ? selectedInstance.name : 'All instances'

  return (
    <Card className="overflow-hidden border border-border/70 bg-gradient-to-br from-background via-background to-muted/20">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Usage Analytics</CardTitle>
            <CardDescription>
              Follow spend, token volume, and request intensity over time, then focus on one instance when you want to isolate behavior.
            </CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="usage-instance-filter">Instance</Label>
              <Select value={effectiveInstanceId} onValueChange={(value) => value && setSelectedInstanceId(value)}>
                <SelectTrigger id="usage-instance-filter" className="h-10 w-full min-w-52 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All instances</SelectItem>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage-period-filter">Window</Label>
              <Select value={selectedPeriod} onValueChange={(value) => value && setSelectedPeriod(value as (typeof PERIOD_OPTIONS)[number]['value'])}>
                <SelectTrigger id="usage-period-filter" className="h-10 w-full min-w-44 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Scope</div>
            <div className="mt-2 truncate text-lg font-semibold">{scopeLabel}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Spend</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(usage?.total_cost ?? 0)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tokens</div>
            <div className="mt-2 text-2xl font-semibold">{formatTokenCount(totals.inputTokens + totals.outputTokens)}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Requests</div>
            <div className="mt-2 text-2xl font-semibold">{totals.requests.toLocaleString()}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
            Loading usage analytics...
          </div>
        ) : !usage || usage.daily.every((day) => day.cost === 0 && day.requests === 0) ? (
          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            No usage data for this selection yet.
          </div>
        ) : (
          <Tabs defaultValue="spend" className="gap-4">
            <TabsList variant="line" className="w-full justify-start gap-2 overflow-x-auto p-0">
              <TabsTrigger value="spend">Spend curve</TabsTrigger>
              <TabsTrigger value="tokens">Token flow</TabsTrigger>
              <TabsTrigger value="instances">Instance mix</TabsTrigger>
            </TabsList>

            <TabsContent value="spend">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="mb-4">
                  <div className="text-sm font-medium">Spend across time</div>
                  <div className="text-sm text-muted-foreground">
                    Daily credit consumption for {scopeLabel.toLowerCase()}.
                  </div>
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usage.daily}>
                      <defs>
                        <linearGradient id="usageCostGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatCompactDate}
                        tick={{ fontSize: 12 }}
                        minTickGap={24}
                      />
                      <YAxis tickFormatter={(value) => `€${value}`} tick={{ fontSize: 12 }} width={52} />
                      <Tooltip content={<UsageTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="#0f766e"
                        fill="url(#usageCostGradient)"
                        strokeWidth={3}
                        name="Cost"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tokens">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="mb-4">
                  <div className="text-sm font-medium">Tokens and request rhythm</div>
                  <div className="text-sm text-muted-foreground">
                    Input and output tokens are stacked per day, with requests overlaid as a line.
                  </div>
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={usage.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatCompactDate}
                        tick={{ fontSize: 12 }}
                        minTickGap={24}
                      />
                      <YAxis yAxisId="tokens" tickFormatter={formatTokenCount} tick={{ fontSize: 12 }} width={52} />
                      <YAxis yAxisId="requests" orientation="right" tick={{ fontSize: 12 }} width={42} />
                      <Tooltip content={<UsageTooltip />} />
                      <Legend />
                      <Bar yAxisId="tokens" dataKey="input_tokens" stackId="tokens" fill="#d97706" radius={[6, 6, 0, 0]} name="Input tokens" />
                      <Bar yAxisId="tokens" dataKey="output_tokens" stackId="tokens" fill="#e11d48" radius={[6, 6, 0, 0]} name="Output tokens" />
                      <Line yAxisId="requests" type="monotone" dataKey="requests" stroke="#475569" strokeWidth={2.5} dot={false} name="Requests" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="instances">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="mb-4">
                  <div className="text-sm font-medium">Where usage is concentrated</div>
                  <div className="text-sm text-muted-foreground">
                    Compare instance contribution by spend for the current filter and time window.
                  </div>
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={usage.by_instance.slice(0, 8).map((row) => ({
                        ...row,
                        short_name: row.instance_name.length > 18 ? `${row.instance_name.slice(0, 18)}...` : row.instance_name,
                      }))}
                      layout="vertical"
                      margin={{ left: 12, right: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-border/60" />
                      <XAxis type="number" tickFormatter={(value) => `€${value}`} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="short_name" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip content={<InstanceSpendTooltip />} />
                      <Bar dataKey="cost" fill="#2563eb" radius={[0, 8, 8, 0]} name="Spend" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
