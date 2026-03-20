import { NextResponse } from 'next/server'
import { requireAuth, requireOrgRole } from '@/lib/auth'
import { manualTopUp } from '@/lib/credits/auto-topup'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

export async function GET() {
  const { org } = await requireAuth()

  const { data: orgData } = await supabaseAdmin
    .from('organizations')
    .select('credit_balance_eur, auto_topup_enabled, auto_topup_amount_eur, auto_topup_threshold_eur, auto_topup_failed')
    .eq('id', org.id)
    .single()

  const { data: transactions } = await supabaseAdmin
    .from('credit_transactions')
    .select('id, type, amount_eur, balance_after_eur, model, description, created_at')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    credit_balance_eur: orgData ? Number(orgData.credit_balance_eur) : 0,
    auto_topup_enabled: orgData?.auto_topup_enabled ?? true,
    auto_topup_amount_eur: orgData ? Number(orgData.auto_topup_amount_eur) : 20,
    auto_topup_threshold_eur: orgData ? Number(orgData.auto_topup_threshold_eur) : 5,
    auto_topup_failed: orgData?.auto_topup_failed ?? false,
    recent_transactions: transactions ?? [],
  })
}

const topUpSchema = z.object({
  amount_eur: z.number().min(5).max(500),
})

export async function POST(req: Request) {
  const { org } = await requireOrgRole('admin')

  if (!org.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = topUpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid amount (min €5, max €500)' }, { status: 400 })
  }

  const { clientSecret } = await manualTopUp(
    org.id,
    org.stripe_customer_id,
    parsed.data.amount_eur,
  )

  return NextResponse.json({ clientSecret })
}

const settingsSchema = z.object({
  auto_topup_enabled: z.boolean().optional(),
  auto_topup_amount_eur: z.number().min(5).max(500).optional(),
  auto_topup_threshold_eur: z.number().min(1).max(100).optional(),
})

export async function PATCH(req: Request) {
  const { org } = await requireOrgRole('admin')

  const body = await req.json()
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.auto_topup_enabled !== undefined) {
    updates.auto_topup_enabled = parsed.data.auto_topup_enabled
  }
  if (parsed.data.auto_topup_amount_eur !== undefined) {
    updates.auto_topup_amount_eur = String(parsed.data.auto_topup_amount_eur)
  }
  if (parsed.data.auto_topup_threshold_eur !== undefined) {
    updates.auto_topup_threshold_eur = String(parsed.data.auto_topup_threshold_eur)
  }
  if (
    parsed.data.auto_topup_enabled !== undefined ||
    parsed.data.auto_topup_amount_eur !== undefined ||
    parsed.data.auto_topup_threshold_eur !== undefined
  ) {
    // Let the org retry auto top-up after they update settings or fix their card in Stripe.
    updates.auto_topup_failed = false
  }

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', org.id)
  }

  return NextResponse.json({ ok: true })
}
