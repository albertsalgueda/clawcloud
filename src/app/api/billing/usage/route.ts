import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getOrgUsageSummary } from '@/lib/stripe/usage'

function getPresetPeriod(period: string): { start: Date; end: Date } | null {
  const now = new Date()

  if (period === 'current') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now),
    }
  }

  const match = period.match(/^(\d+)d$/)
  if (!match) return null

  const days = Number(match[1])
  if (!Number.isFinite(days) || days <= 0) return null

  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  return {
    start,
    end: now,
  }
}

export async function GET(req: Request) {
  const { org } = await requireAuth()
  const { searchParams } = new URL(req.url)
  const instanceId = searchParams.get('instanceId') ?? undefined
  const period = searchParams.get('period') ?? 'current'

  let periodStart: Date
  let periodEnd: Date

  const presetPeriod = getPresetPeriod(period)

  if (presetPeriod) {
    periodStart = presetPeriod.start
    periodEnd = presetPeriod.end
  } else {
    const [year, month] = period.split('-').map(Number)
    if (!year || !month) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }
    periodStart = new Date(year, month - 1, 1)
    periodEnd = new Date(year, month, 0, 23, 59, 59)
  }

  const summary = await getOrgUsageSummary(
    org.id,
    periodStart,
    periodEnd,
    instanceId
  )

  return NextResponse.json(summary)
}
