import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSubscription } from '@/lib/stripe/subscriptions'
import { provisionInstance, logInstanceEvent } from '@/lib/control-plane'
import { PLANS } from '@/lib/constants'
import { generateSlug } from '@/lib/utils'
import { z } from 'zod'

const createInstanceSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-zA-Z0-9\s-]+$/),
  plan: z.enum(['starter', 'pro', 'business']),
  region: z.enum(['eu-central', 'eu-west', 'us-east', 'us-west']),
})

export async function GET() {
  const customer = await requireAuth()

  const { data: instances, error } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('customer_id', customer.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ instances })
}

export async function POST(req: Request) {
  const customer = await requireAuth()
  const body = await req.json()

  const parsed = createInstanceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, plan, region } = parsed.data
  const planConfig = PLANS[plan]

  const { count } = await supabaseAdmin
    .from('instances')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .not('status', 'in', '("deleted","deleting")')

  if ((count ?? 0) >= customer.max_instances) {
    return NextResponse.json(
      { error: `Instance limit reached (${customer.max_instances})` },
      { status: 403 }
    )
  }

  const slug = generateSlug(name)

  const { data: instance, error: insertError } = await supabaseAdmin
    .from('instances')
    .insert({
      customer_id: customer.id,
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

  if (customer.stripe_customer_id) {
    try {
      const subscription = await createSubscription({
        customerId: customer.stripe_customer_id,
        priceId: planConfig.stripe_price_id,
        metadata: { instance_id: instance.id, customer_id: customer.id },
      })

      await supabaseAdmin
        .from('instances')
        .update({
          stripe_subscription_id: subscription.id,
          stripe_subscription_item_id: subscription.items.data[0]?.id,
        })
        .eq('id', instance.id)
    } catch (err) {
      console.error('Stripe subscription creation failed:', err)
    }
  }

  provisionInstance(instance, customer).catch(async (err) => {
    console.error('Provisioning failed:', err)
    await supabaseAdmin
      .from('instances')
      .update({ status: 'error' })
      .eq('id', instance.id)
    await logInstanceEvent(instance.id, 'error', { error: err instanceof Error ? err.message : 'Unknown' })
  })

  await logInstanceEvent(instance.id, 'created', { plan, region })

  return NextResponse.json({ instance }, { status: 201 })
}
