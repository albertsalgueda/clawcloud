import { NextResponse } from 'next/server'
import { canManageInstance, requireAuth } from '@/lib/auth'
import { getServerMetrics } from '@/lib/hetzner/servers'
import { supabaseAdmin } from '@/lib/supabase/admin'

type MetricPoint = {
  timestamp: string
  value: number
}

function toSeries(points: Array<[number, string]>): MetricPoint[] {
  return points.map(([timestamp, value]) => ({
    timestamp: new Date(timestamp * 1000).toISOString(),
    value: Number(value),
  }))
}

function summarize(series: MetricPoint[]) {
  if (series.length === 0) {
    return { current: 0, average: 0, peak: 0, series }
  }

  const values = series.map(point => point.value)
  const total = values.reduce((sum, value) => sum + value, 0)

  return {
    current: values[values.length - 1],
    average: total / values.length,
    peak: Math.max(...values),
    series,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const { profile, org, membership } = await requireAuth()

  const { data: instance, error } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('org_id', org.id)
    .single()

  if (error || !instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  if (membership.role === 'member' && instance.created_by !== profile.id) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  if (!canManageInstance(membership, instance)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (!instance.hetzner_server_id || instance.status !== 'running') {
    return NextResponse.json({ metrics: null })
  }

  const end = new Date()
  const start = new Date(end.getTime() - 60 * 60 * 1000)

  try {
    const [cpuMetrics, diskMetrics, networkMetrics] = await Promise.all([
      getServerMetrics(instance.hetzner_server_id, 'cpu', start.toISOString(), end.toISOString()),
      getServerMetrics(instance.hetzner_server_id, 'disk', start.toISOString(), end.toISOString()),
      getServerMetrics(instance.hetzner_server_id, 'network', start.toISOString(), end.toISOString()),
    ])

    const cpuSeries = toSeries(cpuMetrics.time_series.cpu?.values ?? [])
    const networkInSeries = toSeries(networkMetrics.time_series['network.0.bandwidth.in']?.values ?? [])
    const networkOutSeries = toSeries(networkMetrics.time_series['network.0.bandwidth.out']?.values ?? [])
    const diskReadSeries = toSeries(diskMetrics.time_series['disk.0.bandwidth.read']?.values ?? [])
    const diskWriteSeries = toSeries(diskMetrics.time_series['disk.0.bandwidth.write']?.values ?? [])
    const diskReadIopsSeries = toSeries(diskMetrics.time_series['disk.0.iops.read']?.values ?? [])
    const diskWriteIopsSeries = toSeries(diskMetrics.time_series['disk.0.iops.write']?.values ?? [])

    return NextResponse.json({
      metrics: {
        updated_at: end.toISOString(),
        range_minutes: 60,
        cpu: summarize(cpuSeries),
        network: {
          inbound: summarize(networkInSeries),
          outbound: summarize(networkOutSeries),
        },
        disk: {
          read_bandwidth: summarize(diskReadSeries),
          write_bandwidth: summarize(diskWriteSeries),
          read_iops: summarize(diskReadIopsSeries),
          write_iops: summarize(diskWriteIopsSeries),
        },
      },
    })
  } catch (err) {
    console.error('Failed to fetch Hetzner metrics:', err)
    return NextResponse.json(
      { error: 'Failed to fetch live metrics from Hetzner' },
      { status: 502 }
    )
  }
}
