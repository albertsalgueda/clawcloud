import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getCustomerUsageSummary } from '@/lib/stripe/usage'

export async function GET(req: Request) {
  const customer = await requireAuth()
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

  const summary = await getCustomerUsageSummary(
    customer.id,
    periodStart,
    periodEnd,
    instanceId
  )

  return NextResponse.json(summary)
}
