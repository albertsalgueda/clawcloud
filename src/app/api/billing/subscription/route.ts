import { NextResponse } from 'next/server'
import { requireOrgRole, canManageInstance } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { updateSubscriptionPlan } from '@/lib/stripe/subscriptions'
import { PLANS } from '@/lib/constants'
import { logInstanceEvent } from '@/lib/control-plane'
import { z } from 'zod'

const updateSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  instanceId: z.string().uuid(),
})

export async function POST(req: Request) {
  const { org, membership } = await requireOrgRole('admin')
  const body = await req.json()

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { plan, instanceId } = parsed.data

  const { data: instance } = await supabaseAdmin
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .eq('org_id', org.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  if (!instance.stripe_subscription_id || !instance.stripe_subscription_item_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  const newPlan = PLANS[plan]

  await updateSubscriptionPlan(
    instance.stripe_subscription_id,
    instance.stripe_subscription_item_id,
    newPlan.stripe_price_id
  )

  await supabaseAdmin
    .from('instances')
    .update({ plan })
    .eq('id', instanceId)

  await logInstanceEvent(instanceId, 'plan_changed', { from: instance.plan, to: plan })

  return NextResponse.json({ success: true })
}
