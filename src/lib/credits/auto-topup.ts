import { stripe } from '@/lib/stripe/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { addCredits } from './balance'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Attempt an auto top-up if the balance is below the org's threshold.
 * Uses a PostgreSQL advisory lock to prevent concurrent top-ups for the same org.
 *
 * Call this non-blocking after each credit deduction.
 */
export async function maybeAutoTopUp(
  orgId: string,
  currentBalance: number,
): Promise<void> {
  // Fetch org settings
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, stripe_customer_id, auto_topup_enabled, auto_topup_amount_eur, auto_topup_threshold_eur, auto_topup_failed')
    .eq('id', orgId)
    .single()

  if (!org) return
  if (!org.auto_topup_enabled) return
  if (org.auto_topup_failed) return
  if (!org.stripe_customer_id) return

  const threshold = Number(org.auto_topup_threshold_eur)
  if (currentBalance >= threshold) return

  // Try to acquire an advisory lock to prevent double top-ups.
  // We use a hash of the org ID as the lock key.
  const lockResult = await db.execute(
    sql`SELECT pg_try_advisory_lock(hashtext(${orgId})) AS acquired`
  )
  const rows = lockResult as unknown as Array<{ acquired: boolean }>
  if (!rows?.[0]?.acquired) return // Another process is handling this

  try {
    // Re-check balance under the lock (another call may have topped up)
    const { data: freshOrg } = await supabaseAdmin
      .from('organizations')
      .select('credit_balance_eur')
      .eq('id', orgId)
      .single()

    if (freshOrg && Number(freshOrg.credit_balance_eur) >= threshold) return

    const amount = Number(org.auto_topup_amount_eur)

    // Retrieve the customer's default payment method
    const customer = await stripe.customers.retrieve(org.stripe_customer_id)
    if (customer.deleted) return

    const defaultPaymentMethod =
      typeof customer.invoice_settings?.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id

    if (!defaultPaymentMethod) {
      // No payment method on file — mark as failed so we don't retry endlessly
      await supabaseAdmin
        .from('organizations')
        .update({ auto_topup_failed: true })
        .eq('id', orgId)
      return
    }

    // Create and confirm a PaymentIntent off-session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: 'eur',
      customer: org.stripe_customer_id,
      payment_method: defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        type: 'credit_topup',
        org_id: orgId,
      },
    })

    if (paymentIntent.status === 'succeeded') {
      await addCredits(orgId, amount, {
        stripePaymentIntentId: paymentIntent.id,
        description: `Auto top-up €${amount.toFixed(2)}`,
      })

      // Clear any previous failure flag
      await supabaseAdmin
        .from('organizations')
        .update({ auto_topup_failed: false })
        .eq('id', orgId)
    } else {
      // Payment didn't succeed immediately — mark as failed
      await supabaseAdmin
        .from('organizations')
        .update({ auto_topup_failed: true })
        .eq('id', orgId)
    }
  } catch (err) {
    console.error(`Auto top-up failed for org ${orgId}:`, err)
    await supabaseAdmin
      .from('organizations')
      .update({ auto_topup_failed: true })
      .eq('id', orgId)
  } finally {
    // Release the advisory lock
    await db.execute(
      sql`SELECT pg_advisory_unlock(hashtext(${orgId}))`
    )
  }
}

/**
 * Create a PaymentIntent for a manual top-up.
 * The frontend uses the returned clientSecret with Stripe Elements to confirm payment.
 * The webhook handler for payment_intent.succeeded calls addCredits().
 */
export async function manualTopUp(
  orgId: string,
  stripeCustomerId: string,
  amountEur: number,
): Promise<{ clientSecret: string }> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountEur * 100),
    currency: 'eur',
    customer: stripeCustomerId,
    metadata: {
      type: 'credit_topup',
      org_id: orgId,
    },
  })

  return { clientSecret: paymentIntent.client_secret! }
}
