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
  'eu-central': { hetzner: 'fsn1', label: 'EU Central (Falkenstein)' },
  'eu-west': { hetzner: 'hel1', label: 'EU North (Helsinki)' },
} as const

export type RegionKey = keyof typeof REGIONS

export const PLAN_PRICES: Record<PlanKey, string> = {
  get starter() { return process.env.STRIPE_PRICE_STARTER ?? '' },
  get pro() { return process.env.STRIPE_PRICE_PRO ?? '' },
  get business() { return process.env.STRIPE_PRICE_BUSINESS ?? '' },
}

// Prepaid credit system defaults
export const CREDIT_DEFAULTS = {
  INITIAL_CREDIT_EUR: 5,
  AUTO_TOPUP_AMOUNT_EUR: 20,
  AUTO_TOPUP_THRESHOLD_EUR: 2,
} as const

// Per-token pricing in EUR (price per single token, not per 1K)
export const TOKEN_PRICING_EUR: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-5':  { input: 0.000003,  output: 0.000015 },
  'anthropic/claude-opus-4-6':    { input: 0.000015,  output: 0.000075 },
  'openai/gpt-4o':                { input: 0.0000025, output: 0.00001  },
  'openai/o3-mini':               { input: 0.0000011, output: 0.0000044 },
  'google/gemini-2.5-pro':        { input: 0.00000125,output: 0.000005 },
}

export const DEFAULT_TOKEN_PRICE_EUR = { input: 0.000003, output: 0.000015 }
