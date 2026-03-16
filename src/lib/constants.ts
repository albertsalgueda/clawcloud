export const PLANS = {
  starter: {
    name: 'Starter',
    price_eur: 5.99,
    hetzner_cost: 3.99,
    vcpu: 2,
    ram_gb: 4,
    hetzner_type: 'cx23',
    get stripe_price_id() { return process.env.STRIPE_PRICE_STARTER ?? '' },
  },
  pro: {
    name: 'Pro',
    price_eur: 9.99,
    hetzner_cost: 6.49,
    vcpu: 4,
    ram_gb: 8,
    hetzner_type: 'cx33',
    get stripe_price_id() { return process.env.STRIPE_PRICE_PRO ?? '' },
  },
  business: {
    name: 'Business',
    price_eur: 17.99,
    hetzner_cost: 11.99,
    vcpu: 8,
    ram_gb: 16,
    hetzner_type: 'cx43',
    get stripe_price_id() { return process.env.STRIPE_PRICE_BUSINESS ?? '' },
  },
} as const

export const MAX_INSTANCES_PER_ORG = 50

export type PlanKey = keyof typeof PLANS

export const REGIONS = {
  'eu-central': { hetzner: 'nbg1', label: 'EU Central (Nuremberg)' },
  'eu-west': { hetzner: 'hel1', label: 'EU West (Helsinki)' },
} as const

export type RegionKey = keyof typeof REGIONS

export const PLAN_PRICES: Record<PlanKey, string> = {
  get starter() { return process.env.STRIPE_PRICE_STARTER ?? '' },
  get pro() { return process.env.STRIPE_PRICE_PRO ?? '' },
  get business() { return process.env.STRIPE_PRICE_BUSINESS ?? '' },
}
