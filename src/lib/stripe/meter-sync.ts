import { stripe } from './client'
import { db } from '@/lib/db'
import { usageEvents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TOKEN_PRICE_EUR = 0.000003 // €0.003 per 1000 tokens

/**
 * Syncs Stripe meter event summaries into the local usage_events table.
 *
 * Stripe meter summaries give us aggregated token counts per day per customer.
 * Vercel AI Gateway emits separate meter events for input/output tokens with
 * model info in the payload, but Stripe's summary API only returns the total
 * aggregated value. We store daily totals so the billing dashboard reflects
 * actual metered usage that Stripe will charge for.
 */
export async function syncMeterUsage(
  orgId: string,
  stripeCustomerId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ synced: number }> {
  const meterId = process.env.STRIPE_METER_ID
  if (!meterId) {
    console.warn('STRIPE_METER_ID not set, skipping meter sync')
    return { synced: 0 }
  }

  const startTime = alignToUtcDay(periodStart)
  const endTime = alignToUtcDay(periodEnd)

  if (startTime >= endTime) {
    return { synced: 0 }
  }

  const summaries = await fetchAllSummaries(meterId, stripeCustomerId, startTime, endTime)

  let synced = 0
  for (const summary of summaries) {
    if (summary.aggregated_value <= 0) continue

    const summaryDate = new Date(summary.start_time * 1000)
    const dateKey = summaryDate.toISOString().split('T')[0]
    const meterId = `meter_${stripeCustomerId}_${dateKey}`

    const instanceId = await resolveInstanceId(orgId)
    if (!instanceId) continue

    const billedAmount = summary.aggregated_value * TOKEN_PRICE_EUR

    const existing = await db
      .select({ id: usageEvents.id })
      .from(usageEvents)
      .where(eq(usageEvents.stripe_meter_event_id, meterId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(usageEvents)
        .set({
          input_tokens: Math.round(summary.aggregated_value * 0.8),
          output_tokens: Math.round(summary.aggregated_value * 0.2),
          cost_usd: String(billedAmount),
          billed_usd: String(billedAmount),
        })
        .where(eq(usageEvents.stripe_meter_event_id, meterId))
    } else {
      await db.insert(usageEvents).values({
        instance_id: instanceId,
        org_id: orgId,
        model: 'vercel-ai-gateway',
        input_tokens: Math.round(summary.aggregated_value * 0.8),
        output_tokens: Math.round(summary.aggregated_value * 0.2),
        cost_usd: String(billedAmount),
        billed_usd: String(billedAmount),
        stripe_meter_event_id: meterId,
        created_at: summaryDate,
      })
    }

    synced++
  }

  return { synced }
}

async function fetchAllSummaries(
  meterId: string,
  stripeCustomerId: string,
  startTime: number,
  endTime: number,
) {
  const summaries: Array<{
    id: string
    aggregated_value: number
    start_time: number
    end_time: number
  }> = []

  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.billing.meters.listEventSummaries(
      meterId,
      {
        customer: stripeCustomerId,
        start_time: startTime,
        end_time: endTime,
        value_grouping_window: 'day' as const,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
    )

    summaries.push(...page.data)
    hasMore = page.has_more
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id
    } else {
      break
    }
  }

  return summaries
}

/**
 * Resolves the primary instance ID for an org. If the org has
 * multiple instances, picks the most recently active one. Meter summaries
 * don't include instance-level granularity, so this is best-effort.
 */
async function resolveInstanceId(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('instances')
    .select('id')
    .eq('org_id', orgId)
    .not('status', 'in', '("deleted","deleting")')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data?.id ?? null
}

function alignToUtcDay(date: Date): number {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}
