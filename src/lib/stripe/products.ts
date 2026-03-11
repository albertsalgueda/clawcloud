import type { PlanKey } from '@/lib/constants'

export const PLAN_PRICES: Record<PlanKey, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  business: process.env.STRIPE_PRICE_BUSINESS ?? '',
}
