export const PLANS = {
  starter: {
    name: 'Starter',
    price_eur: 9,
    vcpu: 2,
    ram_gb: 4,
    hetzner_type: 'cx23',
    max_instances: 1,
    markup_pct: 30,
    get stripe_price_id() { return process.env.STRIPE_PRICE_STARTER ?? '' },
  },
  pro: {
    name: 'Pro',
    price_eur: 29,
    vcpu: 4,
    ram_gb: 8,
    hetzner_type: 'cx33',
    max_instances: 3,
    markup_pct: 25,
    get stripe_price_id() { return process.env.STRIPE_PRICE_PRO ?? '' },
  },
  business: {
    name: 'Business',
    price_eur: 79,
    vcpu: 8,
    ram_gb: 16,
    hetzner_type: 'cx43',
    max_instances: 10,
    markup_pct: 20,
    get stripe_price_id() { return process.env.STRIPE_PRICE_BUSINESS ?? '' },
  },
} as const

export type PlanKey = keyof typeof PLANS

export const REGIONS = {
  'eu-central': { hetzner: 'fsn1', label: 'EU Central (Falkenstein)' },
  'eu-west': { hetzner: 'hel1', label: 'EU West (Helsinki)' },
  'us-east': { hetzner: 'ash', label: 'US East (Ashburn)' },
  'us-west': { hetzner: 'hil', label: 'US West (Hillsboro)' },
} as const

export type RegionKey = keyof typeof REGIONS

export const PLAN_PRICES: Record<PlanKey, string> = {
  get starter() { return process.env.STRIPE_PRICE_STARTER ?? '' },
  get pro() { return process.env.STRIPE_PRICE_PRO ?? '' },
  get business() { return process.env.STRIPE_PRICE_BUSINESS ?? '' },
}
