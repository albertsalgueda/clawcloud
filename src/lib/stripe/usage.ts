import { db } from '@/lib/db'
import { usageEvents } from '@/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

export interface UsageSummary {
  period: { start: Date; end: Date }
  base_cost: number
  token_cost: number
  total_cost: number
  by_model: Array<{
    model: string
    input_tokens: number
    output_tokens: number
    cost: number
  }>
  daily: Array<{
    date: string
    cost: number
  }>
}

export async function getOrgUsageSummary(
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
  instanceId?: string
): Promise<UsageSummary> {
  const conditions = [
    eq(usageEvents.org_id, orgId),
    gte(usageEvents.created_at, periodStart),
    lte(usageEvents.created_at, periodEnd),
  ]
  if (instanceId) {
    conditions.push(eq(usageEvents.instance_id, instanceId))
  }

  const byModel = await db
    .select({
      model: usageEvents.model,
      input_tokens: sql<number>`COALESCE(SUM(${usageEvents.input_tokens}), 0)::int`,
      output_tokens: sql<number>`COALESCE(SUM(${usageEvents.output_tokens}), 0)::int`,
      cost: sql<number>`COALESCE(SUM(${usageEvents.billed_usd}::numeric), 0)::float`,
    })
    .from(usageEvents)
    .where(and(...conditions))
    .groupBy(usageEvents.model)

  const daily = await db
    .select({
      date: sql<string>`DATE(${usageEvents.created_at})::text`,
      cost: sql<number>`COALESCE(SUM(${usageEvents.billed_usd}::numeric), 0)::float`,
    })
    .from(usageEvents)
    .where(and(...conditions))
    .groupBy(sql`DATE(${usageEvents.created_at})`)
    .orderBy(sql`DATE(${usageEvents.created_at})`)

  const tokenCost = byModel.reduce((sum, m) => sum + Number(m.cost), 0)

  return {
    period: { start: periodStart, end: periodEnd },
    base_cost: 0,
    token_cost: tokenCost,
    total_cost: tokenCost,
    by_model: byModel.map(m => ({
      model: m.model,
      input_tokens: Number(m.input_tokens),
      output_tokens: Number(m.output_tokens),
      cost: Number(m.cost),
    })),
    daily: daily.map(d => ({
      date: d.date,
      cost: Number(d.cost),
    })),
  }
}
