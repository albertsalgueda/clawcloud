import type { PlanKey } from '@/lib/constants'

export const PLAN_PRICES: Record<PlanKey, string> = {
  get starter() { return process.env.STRIPE_PRICE_STARTER ?? '' },
  get pro() { return process.env.STRIPE_PRICE_PRO ?? '' },
  get business() { return process.env.STRIPE_PRICE_BUSINESS ?? '' },
}
