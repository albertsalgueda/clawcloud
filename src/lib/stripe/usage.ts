import { db } from '@/lib/db'
import { creditTransactions } from '@/lib/db/schema'
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
    eq(creditTransactions.org_id, orgId),
    eq(creditTransactions.type, 'usage'),
    gte(creditTransactions.created_at, periodStart),
    lte(creditTransactions.created_at, periodEnd),
  ]
  if (instanceId) {
    conditions.push(eq(creditTransactions.instance_id, instanceId))
  }

  const byModel = await db
    .select({
      model: creditTransactions.model,
      input_tokens: sql<number>`COALESCE(SUM(${creditTransactions.input_tokens}), 0)::int`,
      output_tokens: sql<number>`COALESCE(SUM(${creditTransactions.output_tokens}), 0)::int`,
      cost: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount_eur}::numeric)), 0)::float`,
    })
    .from(creditTransactions)
    .where(and(...conditions))
    .groupBy(creditTransactions.model)

  const daily = await db
    .select({
      date: sql<string>`DATE(${creditTransactions.created_at})::text`,
      cost: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount_eur}::numeric)), 0)::float`,
    })
    .from(creditTransactions)
    .where(and(...conditions))
    .groupBy(sql`DATE(${creditTransactions.created_at})`)
    .orderBy(sql`DATE(${creditTransactions.created_at})`)

  const tokenCost = byModel.reduce((sum, m) => sum + Number(m.cost), 0)

  return {
    period: { start: periodStart, end: periodEnd },
    base_cost: 0,
    token_cost: tokenCost,
    total_cost: tokenCost,
    by_model: byModel.map(m => ({
      model: m.model ?? 'unknown',
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
