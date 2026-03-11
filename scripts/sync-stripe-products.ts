import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function setup() {
  const product = await stripe.products.create({
    name: 'ClawCloud Instance',
    description: 'Managed OpenClaw instance',
  })

  const starterPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 900,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'starter' },
  })

  const proPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 2900,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro' },
  })

  const businessPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 7900,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'business' },
  })

  const meter = await stripe.billing.meters.create({
    display_name: 'AI Token Usage',
    event_name: 'token-billing-tokens',
    default_aggregation: { formula: 'sum' },
    value_settings: { event_payload_key: 'value' },
  })

  const tokenPrice = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    recurring: {
      interval: 'month',
      usage_type: 'metered',
      meter: meter.id,
    },
    unit_amount_decimal: '0.003',
    billing_scheme: 'per_unit',
    metadata: { type: 'token_usage' },
  })

  console.log('Created:', {
    product: product.id,
    prices: {
      starter: starterPrice.id,
      pro: proPrice.id,
      business: businessPrice.id,
      token_usage: tokenPrice.id,
    },
    meter: meter.id,
  })

  console.log('\nAdd these to your .env.local:')
  console.log(`STRIPE_PRICE_STARTER=${starterPrice.id}`)
  console.log(`STRIPE_PRICE_PRO=${proPrice.id}`)
  console.log(`STRIPE_PRICE_BUSINESS=${businessPrice.id}`)
  console.log(`STRIPE_PRICE_TOKEN_USAGE=${tokenPrice.id}`)
  console.log(`STRIPE_METER_ID=${meter.id}`)
}

setup().catch(console.error)
