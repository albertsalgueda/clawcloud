import { db } from '@/lib/db'
import { organizations, creditTransactions } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

interface DeductMeta {
  instanceId: string
  model: string
  inputTokens: number
  outputTokens: number
}

interface AddMeta {
  stripePaymentIntentId?: string
  description?: string
}

/**
 * Get the current credit balance for an organization.
 */
export async function getBalance(orgId: string): Promise<number> {
  const [row] = await db
    .select({ balance: organizations.credit_balance_eur })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  return row ? Number(row.balance) : 0
}

/**
 * Lightweight balance check without row locking.
 * Used by the proxy for a fast pre-check before forwarding requests.
 */
export async function checkSufficientBalance(
  orgId: string,
  estimatedCost: number,
): Promise<boolean> {
  const balance = await getBalance(orgId)
  return balance >= estimatedCost
}

/**
 * Deduct credits from an organization's balance atomically.
 * Uses SELECT ... FOR UPDATE to prevent race conditions.
 * Returns { success: false } if insufficient balance.
 */
export async function deductCredits(
  orgId: string,
  amount: number,
  meta: DeductMeta,
): Promise<{ success: boolean; newBalance: number }> {
  if (amount <= 0) {
    return { success: false, newBalance: await getBalance(orgId) }
  }

  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE organizations
      SET credit_balance_eur = credit_balance_eur - ${String(amount)},
          updated_at = NOW()
      WHERE id = ${orgId}::uuid
        AND credit_balance_eur >= ${String(amount)}
      RETURNING credit_balance_eur
    )
    INSERT INTO credit_transactions (org_id, instance_id, type, amount_eur, balance_after_eur, model, input_tokens, output_tokens)
    SELECT
      ${orgId}::uuid,
      ${meta.instanceId}::uuid,
      'usage',
      ${String(-amount)},
      (SELECT credit_balance_eur FROM updated),
      ${meta.model},
      ${meta.inputTokens},
      ${meta.outputTokens}
    WHERE EXISTS (SELECT 1 FROM updated)
    RETURNING balance_after_eur
  `)

  const rows = result as unknown as Array<{ balance_after_eur: string }>
  if (!rows || rows.length === 0) {
    return { success: false, newBalance: await getBalance(orgId) }
  }

  return { success: true, newBalance: Number(rows[0].balance_after_eur) }
}

/**
 * Add credits to an organization's balance atomically.
 * Returns the new balance.
 */
export async function addCredits(
  orgId: string,
  amount: number,
  meta: AddMeta = {},
): Promise<number> {
  if (amount <= 0) {
    return await getBalance(orgId)
  }

  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE organizations
      SET credit_balance_eur = credit_balance_eur + ${String(amount)},
          updated_at = NOW()
      WHERE id = ${orgId}::uuid
      RETURNING credit_balance_eur
    )
    INSERT INTO credit_transactions (org_id, type, amount_eur, balance_after_eur, stripe_payment_intent_id, description)
    SELECT
      ${orgId}::uuid,
      'topup',
      ${String(amount)},
      (SELECT credit_balance_eur FROM updated),
      ${meta.stripePaymentIntentId ?? null},
      ${meta.description ?? null}
    WHERE EXISTS (SELECT 1 FROM updated)
    RETURNING balance_after_eur
  `)

  const rows = result as unknown as Array<{ balance_after_eur: string }>
  if (!rows || rows.length === 0) {
    return await getBalance(orgId)
  }

  return Number(rows[0].balance_after_eur)
}
