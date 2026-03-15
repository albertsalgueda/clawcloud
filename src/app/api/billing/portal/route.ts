import { NextResponse } from 'next/server'
import { requireOrgRole } from '@/lib/auth'
import { createPortalSession } from '@/lib/stripe/portal'

export async function POST() {
  const { org } = await requireOrgRole('owner')

  if (!org.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account' }, { status: 400 })
  }

  const url = await createPortalSession(
    org.stripe_customer_id,
    `${process.env.NEXT_PUBLIC_APP_URL}/${org.slug}/billing`
  )

  return NextResponse.json({ url })
}
