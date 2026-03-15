import { NextResponse } from 'next/server'
import { requireAuth, canManageInstance } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logInstanceEvent } from '@/lib/control-plane'
import { PLAN_PRICES } from '@/lib/constants'
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
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
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
    .not('status', 'in', '("deleted","deleting")')

  if ((count ?? 0) >= org.max_instances) {
    return NextResponse.json(
      { error: `Instance limit reached (${org.max_instances})` },
      { status: 403 }
    )
  }

  const slug = generateSlug(name)

  const { data: instance, error: insertError } = await supabaseAdmin
    .from('instances')
    .insert({
      org_id: org.id,
      created_by: profile.id,
      name,
      slug,
      plan,
      region,
      status: 'pending_payment',
    })
    .select()
    .single()

  if (insertError || !instance) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create instance' }, { status: 500 })
  }

  await logInstanceEvent(instance.id, 'created', { plan, region })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const session = await createInstanceCheckout({
      customerId: stripeCustomerId,
      priceId: PLAN_PRICES[plan],
      instanceId: instance.id,
      orgId: org.id,
      orgSlug: org.slug,
      successUrl: `${appUrl}/${org.slug}/instances/${instance.id}?checkout=success`,
      cancelUrl: `${appUrl}/${org.slug}/instances/new?checkout=cancelled`,
    })

    return NextResponse.json({
      instance: { ...instance, status: 'pending_payment' },
      checkoutUrl: session.url,
    }, { status: 201 })
  } catch (err) {
    console.error('Checkout session creation failed:', err)
    await supabaseAdmin
      .from('instances')
      .update({ status: 'error' })
      .eq('id', instance.id)
    await logInstanceEvent(instance.id, 'error', {
      error: err instanceof Error ? err.message : 'Checkout creation failed',
    })
    return NextResponse.json(
      { error: 'Failed to set up billing. Please try again.' },
      { status: 500 }
    )
  }
}
