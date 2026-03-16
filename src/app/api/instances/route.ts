import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLAN_PRICES, MAX_INSTANCES_PER_ORG } from '@/lib/constants'
import { createInstanceCheckout } from '@/lib/stripe/subscriptions'
import { ensureStripeCustomer } from '@/lib/stripe/ensure-customer'
import { generateSlug } from '@/lib/utils'
import { z } from 'zod'

const createInstanceSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-zA-Z0-9\s-]+$/),
  plan: z.enum(['starter', 'pro', 'business']),
  region: z.enum(['eu-central', 'eu-west']),
})

export async function GET() {
  const { profile, org, membership } = await requireAuth()

  let query = supabaseAdmin
    .from('instances')
    .select('*')
    .eq('org_id', org.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (membership.role === 'member') {
    query = query.eq('created_by', profile.id)
  }

  const { data: instances, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ instances })
}

export const maxDuration = 30

export async function POST(req: Request) {
  const { profile, org } = await requireAuth()
  const body = await req.json()

  const parsed = createInstanceSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const msg = Object.entries(fieldErrors)
      .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
      .join('; ')
    return NextResponse.json({ error: msg || 'Invalid input' }, { status: 400 })
  }

  const stripeCustomerId = await ensureStripeCustomer(org)
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'Billing account could not be created. Please contact support.' },
      { status: 400 }
    )
  }

  const { name, plan, region } = parsed.data

  const { count } = await supabaseAdmin
    .from('instances')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .in('status', ['provisioning', 'running', 'stopped'])

  if ((count ?? 0) >= MAX_INSTANCES_PER_ORG) {
    return NextResponse.json(
      { error: `Instance limit reached (${MAX_INSTANCES_PER_ORG})` },
      { status: 403 }
    )
  }

  const slug = generateSlug(name)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const session = await createInstanceCheckout({
      customerId: stripeCustomerId,
      priceId: PLAN_PRICES[plan],
      orgId: org.id,
      orgSlug: org.slug,
      metadata: {
        instance_name: name,
        instance_slug: slug,
        instance_plan: plan,
        instance_region: region,
        created_by: profile.id,
        org_id: org.id,
      },
      successUrl: `${appUrl}/${org.slug}/instances?checkout=success`,
      cancelUrl: `${appUrl}/${org.slug}/instances/new?checkout=cancelled`,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ checkoutUrl: session.url }, { status: 201 })
  } catch (err) {
    console.error('Checkout session creation failed:', err)
    return NextResponse.json(
      { error: 'Failed to set up billing. Please try again.' },
      { status: 500 }
    )
  }
}
