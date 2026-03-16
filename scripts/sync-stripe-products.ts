import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...)')
  process.exit(1)
}

const stripe = new Stripe(key)
const isTest = key.startsWith('sk_test_')
const webhookUrl = process.argv[2]

async function setup() {
  console.log(`\nMode: ${isTest ? 'TEST' : 'LIVE'}\n`)

  const product = await stripe.products.create({
    name: 'Agent Computer Instance',
    description: 'Managed OpenClaw agent computer instance with AI billing',
  })

  const starterPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 599,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'starter' },
    nickname: 'Starter - per instance',
  })

  const proPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 999,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro' },
    nickname: 'Pro - per instance',
  })

  const businessPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 1799,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'business' },
    nickname: 'Business - per instance',
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
    nickname: 'AI Token Usage - metered',
  })

  let webhookSecret: string | undefined
  if (webhookUrl) {
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
        'billing.meter.created',
        'billing.meter.updated',
        'billing.meter.deactivated',
        'billing.meter.reactivated',
      ],
      description: `Agent Computers - ${isTest ? 'test' : 'production'} webhook`,
    })
    webhookSecret = webhook.secret
    console.log(`Webhook: ${webhook.id} -> ${webhookUrl}`)
  }

  console.log('\n--- Add these to your .env.local ---\n')
  console.log(`STRIPE_PRICE_STARTER=${starterPrice.id}`)
  console.log(`STRIPE_PRICE_PRO=${proPrice.id}`)
  console.log(`STRIPE_PRICE_BUSINESS=${businessPrice.id}`)
  console.log(`STRIPE_PRICE_TOKEN_USAGE=${tokenPrice.id}`)
  console.log(`STRIPE_METER_ID=${meter.id}`)
  if (webhookSecret) {
    console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`)
  }

  console.log('\n--- Summary ---\n')
  console.log({
    product: product.id,
    prices: { starter: starterPrice.id, pro: proPrice.id, business: businessPrice.id, token_usage: tokenPrice.id },
    meter: meter.id,
    webhook: webhookSecret ? 'created' : 'skipped (no URL provided)',
  })
}

setup().catch(console.error)
