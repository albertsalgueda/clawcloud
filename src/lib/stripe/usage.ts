import { db } from '@/lib/db'
import { creditTransactions, instances } from '@/lib/db/schema'
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
    input_tokens: number
    output_tokens: number
    requests: number
  }>
  by_instance: Array<{
    instance_id: string | null
    instance_name: string
    cost: number
    input_tokens: number
    output_tokens: number
    requests: number
  }>
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

  const byInstance = await db
    .select({
      instance_id: creditTransactions.instance_id,
      instance_name: instances.name,
      input_tokens: sql<number>`COALESCE(SUM(${creditTransactions.input_tokens}), 0)::int`,
      output_tokens: sql<number>`COALESCE(SUM(${creditTransactions.output_tokens}), 0)::int`,
      requests: sql<number>`COUNT(*)::int`,
      cost: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount_eur}::numeric)), 0)::float`,
    })
    .from(creditTransactions)
    .leftJoin(instances, eq(creditTransactions.instance_id, instances.id))
    .where(and(...conditions))
    .groupBy(creditTransactions.instance_id, instances.name)
    .orderBy(sql`COALESCE(SUM(ABS(${creditTransactions.amount_eur}::numeric)), 0) DESC`)

  const daily = await db
    .select({
      date: sql<string>`DATE(${creditTransactions.created_at})::text`,
      cost: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount_eur}::numeric)), 0)::float`,
      input_tokens: sql<number>`COALESCE(SUM(${creditTransactions.input_tokens}), 0)::int`,
      output_tokens: sql<number>`COALESCE(SUM(${creditTransactions.output_tokens}), 0)::int`,
      requests: sql<number>`COUNT(*)::int`,
    })
    .from(creditTransactions)
    .where(and(...conditions))
    .groupBy(sql`DATE(${creditTransactions.created_at})`)
    .orderBy(sql`DATE(${creditTransactions.created_at})`)

  const dailyMap = new Map(
    daily.map((entry) => [entry.date, entry]),
  )

  const filledDaily: UsageSummary['daily'] = []
  const cursor = new Date(periodStart)
  cursor.setHours(0, 0, 0, 0)
  const finalDay = new Date(periodEnd)
  finalDay.setHours(0, 0, 0, 0)

  while (cursor <= finalDay) {
    const dateKey = formatDateKey(cursor)
    const entry = dailyMap.get(dateKey)

    filledDaily.push({
      date: dateKey,
      cost: Number(entry?.cost ?? 0),
      input_tokens: Number(entry?.input_tokens ?? 0),
      output_tokens: Number(entry?.output_tokens ?? 0),
      requests: Number(entry?.requests ?? 0),
    })

    cursor.setDate(cursor.getDate() + 1)
  }

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
    by_instance: byInstance.map((row) => ({
      instance_id: row.instance_id,
      instance_name: row.instance_name ?? 'Unassigned usage',
      cost: Number(row.cost),
      input_tokens: Number(row.input_tokens),
      output_tokens: Number(row.output_tokens),
      requests: Number(row.requests),
    })),
    daily: filledDaily.map(d => ({
      date: d.date,
      cost: Number(d.cost),
      input_tokens: Number(d.input_tokens),
      output_tokens: Number(d.output_tokens),
      requests: Number(d.requests),
    })),
  }
}
