import { NextResponse } from 'next/server'
import { requireAuth, canManageInstance } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { provisionInstance, logInstanceEvent } from '@/lib/control-plane'
import { PLAN_PRICES } from '@/lib/constants'
import { createSubscription } from '@/lib/stripe/subscriptions'
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
      status: 'provisioning',
    })
    .select()
    .single()

  if (insertError || !instance) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create instance' }, { status: 500 })
  }

  await logInstanceEvent(instance.id, 'created', { plan, region })

  try {
    const subscription = await createSubscription({
      customerId: stripeCustomerId,
      priceId: PLAN_PRICES[plan],
      metadata: { instance_id: instance.id, org_id: org.id },
    })

    await supabaseAdmin
      .from('instances')
      .update({
        stripe_subscription_id: subscription.id,
        stripe_subscription_item_id: subscription.items.data[0]?.id,
      })
      .eq('id', instance.id)

    await logInstanceEvent(instance.id, 'subscription_created', {
      subscription_id: subscription.id,
    })
  } catch (err) {
    console.error('Subscription creation failed:', err)
    await supabaseAdmin
      .from('instances')
      .update({ status: 'error' })
      .eq('id', instance.id)
    await logInstanceEvent(instance.id, 'error', {
      error: err instanceof Error ? err.message : 'Subscription creation failed',
    })
    return NextResponse.json(
      { error: 'Failed to set up billing. Please check your payment method.' },
      { status: 402 }
    )
  }

  try {
    await provisionInstance(instance, org)
    return NextResponse.json({ instance: { ...instance, status: 'provisioning' } }, { status: 201 })
  } catch (err) {
    console.error('Provisioning failed:', err)
    await supabaseAdmin
      .from('instances')
      .update({ status: 'error' })
      .eq('id', instance.id)
    await logInstanceEvent(instance.id, 'error', {
      error: err instanceof Error ? err.message : 'Unknown provisioning error',
    })
    return NextResponse.json({ instance: { ...instance, status: 'error' } }, { status: 201 })
  }
}
