export const PLANS = {
  starter: {
    name: 'Starter',
    price_eur: 9,
    vcpu: 1,
    ram_gb: 1,
    hetzner_type: 'cx22',
    max_instances: 1,
    markup_pct: 30,
    stripe_price_id: process.env.STRIPE_PRICE_STARTER!,
  },
  pro: {
    name: 'Pro',
    price_eur: 29,
    vcpu: 2,
    ram_gb: 4,
    hetzner_type: 'cx32',
    max_instances: 3,
    markup_pct: 25,
    stripe_price_id: process.env.STRIPE_PRICE_PRO!,
  },
  business: {
    name: 'Business',
    price_eur: 79,
    vcpu: 4,
    ram_gb: 8,
    hetzner_type: 'cx42',
    max_instances: 10,
    markup_pct: 20,
    stripe_price_id: process.env.STRIPE_PRICE_BUSINESS!,
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
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  business: process.env.STRIPE_PRICE_BUSINESS ?? '',
}
