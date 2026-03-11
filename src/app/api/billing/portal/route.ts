import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createPortalSession } from '@/lib/stripe/portal'

export async function POST() {
  const customer = await requireAuth()

  if (!customer.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account' }, { status: 400 })
  }

  const url = await createPortalSession(
    customer.stripe_customer_id,
    `${process.env.NEXT_PUBLIC_APP_URL}/billing`
  )

  return NextResponse.json({ url })
}
