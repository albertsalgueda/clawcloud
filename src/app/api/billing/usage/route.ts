import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getOrgUsageSummary } from '@/lib/stripe/usage'
import { syncMeterUsage } from '@/lib/stripe/meter-sync'

export async function GET(req: Request) {
  const { org } = await requireAuth()
  const { searchParams } = new URL(req.url)
  const instanceId = searchParams.get('instanceId') ?? undefined
  const period = searchParams.get('period') ?? 'current'

  let periodStart: Date
  let periodEnd: Date

  if (period === 'current') {
    const now = new Date()
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  } else {
    const [year, month] = period.split('-').map(Number)
    periodStart = new Date(year, month - 1, 1)
    periodEnd = new Date(year, month, 0, 23, 59, 59)
  }

  if (org.stripe_customer_id) {
    try {
      await syncMeterUsage(
        org.id,
        org.stripe_customer_id,
        periodStart,
        periodEnd,
      )
    } catch (err) {
      console.error('Meter sync failed (non-blocking):', err)
    }
  }

  const summary = await getOrgUsageSummary(
    org.id,
    periodStart,
    periodEnd,
    instanceId
  )

  return NextResponse.json(summary)
}
