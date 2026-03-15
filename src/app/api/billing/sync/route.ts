import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { syncMeterUsage } from '@/lib/stripe/meter-sync'

export async function POST() {
  const { org } = await requireAuth()

  if (!org.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account' }, { status: 400 })
  }

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const result = await syncMeterUsage(
    org.id,
    org.stripe_customer_id,
    periodStart,
    periodEnd,
  )

  return NextResponse.json(result)
}
