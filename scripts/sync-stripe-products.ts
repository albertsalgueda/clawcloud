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
    description: 'Managed OpenClaw agent computer instance — compute subscription',
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
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
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
  if (webhookSecret) {
    console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`)
  }

  console.log('\n--- Summary ---\n')
  console.log({
    product: product.id,
    prices: { starter: starterPrice.id, pro: proPrice.id, business: businessPrice.id },
    webhook: webhookSecret ? 'created' : 'skipped (no URL provided)',
  })
}

setup().catch(console.error)
