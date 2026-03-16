# Agent Computers

Managed OpenClaw agent computer instances with per-instance billing via Stripe and AI token metering via Vercel AI Gateway.

## Architecture

```
User -> Next.js Dashboard (agentcomputers.app)
          |
          +-> Stripe Checkout (per-instance subscription)
          +-> Hetzner Cloud API (VPS provisioning)
          +-> Supabase (auth + database)
          +-> Vercel AI Gateway (LLM routing + token metering)
                |
                +-> Stripe Billing Meters (usage-based billing)
```

Each instance gets its own Stripe subscription with:
- A fixed monthly compute fee (based on plan tier)
- Metered AI token usage billed at the end of each billing cycle

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth:** Supabase Auth
- **Database:** Supabase Postgres + Drizzle ORM
- **Payments:** Stripe (Checkout, Subscriptions, Billing Meters)
- **Infrastructure:** Hetzner Cloud (VPS), Cloudflare DNS
- **AI Gateway:** Vercel AI Gateway with Stripe metering headers
- **UI:** shadcn/ui, Tailwind CSS, Recharts
- **Testing:** Vitest
- **CI:** GitHub Actions

## Plans & Pricing

| Plan | Price | Specs | Hetzner Type |
|------|-------|-------|-------------|
| Starter | 5.99 EUR/mo | 2 vCPU, 4 GB RAM | cx23 |
| Pro | 9.99 EUR/mo | 4 vCPU, 8 GB RAM | cx33 |
| Business | 17.99 EUR/mo | 8 vCPU, 16 GB RAM | cx43 |

Plus metered AI token usage on top.

## Getting Started

### Prerequisites

- Node.js 22+
- A Supabase project
- A Stripe account
- A Hetzner Cloud account
- (Optional) Cloudflare account for DNS

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in all values. See `.env.example` for the full list.

### 3. Set up Stripe resources

This creates the product, plan prices, billing meter, metered price, and webhook in one command:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY npx tsx scripts/sync-stripe-products.ts http://localhost:3000/api/webhooks/stripe
```

Paste the output values into your `.env.local`.

### 4. Run database migrations

```bash
npx supabase db push
```

Or if using Drizzle:

```bash
npm run db:push
```

### 5. Start the dev server

```bash
npm run dev
```

### 6. Forward Stripe webhooks locally

In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` signing secret it prints and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Testing

### Run tests

```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

### Test with Stripe test mode (no real charges)

Local development uses Stripe test mode by default. To test the full payment flow:

1. Make sure `.env.local` has `sk_test_...` keys (not `sk_live_...`)
2. Start the Stripe webhook listener: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Start the dev server: `npm run dev`
4. Create an instance in the UI
5. At Stripe Checkout, use test card **4242 4242 4242 4242**, any future expiry, any CVC
6. Payment succeeds instantly, the webhook fires, and the instance starts provisioning

Other useful test cards:
- `4000 0000 0000 3220` -- triggers 3D Secure authentication
- `4000 0000 0000 0002` -- always declines

### Setting up a fresh Stripe test environment

If you need to create test Stripe resources from scratch:

```bash
# Set your test secret key and run the setup script
STRIPE_SECRET_KEY=sk_test_YOUR_KEY npx tsx scripts/sync-stripe-products.ts http://localhost:3000/api/webhooks/stripe
```

This creates:
- A product ("Agent Computer Instance")
- Three plan prices (Starter, Pro, Business)
- A billing meter (`token-billing-tokens`)
- A metered price for AI token usage
- A webhook endpoint

The script prints all the env vars you need -- paste them into `.env.local`.

## CI / CD

### GitHub Actions

The CI pipeline runs on every push to `master` and every PR:
- **Lint** (`eslint`)
- **Typecheck** (`tsc --noEmit`)
- **Tests** (`vitest run`)

### Vercel Deployment

- Push to `master` deploys to production (`agentcomputers.app`) with live Stripe keys
- PRs create preview deployments

### Vercel Preview with Stripe Test Mode

To set up preview deployments with test Stripe:

1. Run the setup script with your preview URL:
   ```bash
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY npx tsx scripts/sync-stripe-products.ts https://YOUR-PREVIEW-URL.vercel.app/api/webhooks/stripe
   ```

2. In the Vercel dashboard, add the test env vars to the **Preview** environment:
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` = output from step 1
   - `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` = output from step 1
   - `STRIPE_PRICE_TOKEN_USAGE`, `STRIPE_METER_ID` = output from step 1

3. Production env vars (live keys) remain unchanged.

## Key Environment Variables

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `STRIPE_RESTRICTED_ACCESS_KEY` | Restricted key for AI Gateway meter events (`rk_live_...`) |
| `STRIPE_PRICE_STARTER` | Stripe price ID for Starter plan |
| `STRIPE_PRICE_PRO` | Stripe price ID for Pro plan |
| `STRIPE_PRICE_BUSINESS` | Stripe price ID for Business plan |
| `STRIPE_PRICE_TOKEN_USAGE` | Stripe price ID for metered token usage |
| `STRIPE_METER_ID` | Stripe billing meter ID |
| `HETZNER_API_TOKEN` | Hetzner Cloud API token |
| `HETZNER_SSH_KEY_ID` | Hetzner SSH key ID for server access |
| `VERCEL_AI_GATEWAY_KEY` | Vercel AI Gateway API key |
| `INSTANCE_DOMAIN` | Domain for instance dashboards (e.g. `agentcomputers.app`) |
| `DATABASE_URL` | Postgres connection string |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |
| `npm run stripe:setup` | Create Stripe products/prices/meter |
| `npm run seed` | Seed dev data |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## Billing Flow

```
1. User creates instance -> POST /api/instances
2. API creates instance (status: pending_payment) + Stripe Checkout Session
3. User pays at Stripe Checkout
4. Stripe fires checkout.session.completed webhook
5. Webhook transitions instance to "provisioning" (idempotent)
6. provisionInstance() creates Hetzner VPS with OpenClaw + AI Gateway config
7. Instance goes "running" -- AI calls routed through Vercel AI Gateway
8. Gateway emits Stripe meter events with customer's stripe-customer-id
9. Stripe accumulates token usage, charges at end of billing cycle
```
