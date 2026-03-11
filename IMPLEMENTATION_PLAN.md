# ClawCloud — MVP Implementation Plan (Phase 1 + 2)

**Scope:** Foundation + Usage Billing (4-5 weeks)
**Stack:** Next.js 15 App Router, Supabase, Stripe, Hetzner Cloud API, Vercel AI Gateway, Clerk, shadcn/ui

---

## 1. Project Structure

```
clawcloud/
├── .env.example
├── .env.local                          # gitignored
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── middleware.ts                        # Clerk auth middleware
├── drizzle.config.ts                   # Drizzle ORM config for Supabase
│
├── public/
│   ├── logo.svg
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: ClerkProvider, ThemeProvider
│   │   ├── page.tsx                    # Marketing landing / redirect to dashboard
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   │   └── layout.tsx             # Centered auth layout
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Sidebar + topbar shell, auth guard
│   │   │   ├── page.tsx               # Dashboard home → redirect to /instances
│   │   │   │
│   │   │   ├── instances/
│   │   │   │   ├── page.tsx           # Instance list (cards grid)
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx       # Create instance form
│   │   │   │   └── [instanceId]/
│   │   │   │       ├── page.tsx       # Instance overview (status, IP, uptime)
│   │   │   │       ├── settings/
│   │   │   │       │   └── page.tsx   # Instance config (env vars, model, channels)
│   │   │   │       ├── usage/
│   │   │   │       │   └── page.tsx   # Per-instance token usage breakdown
│   │   │   │       └── logs/
│   │   │   │           └── page.tsx   # Instance logs viewer (Phase 3 placeholder)
│   │   │   │
│   │   │   ├── billing/
│   │   │   │   ├── page.tsx           # Current month spend, plan info, usage chart
│   │   │   │   └── portal/
│   │   │   │       └── page.tsx       # Redirect to Stripe Customer Portal
│   │   │   │
│   │   │   └── settings/
│   │   │       └── page.tsx           # Account settings (SSH keys, profile)
│   │   │
│   │   └── api/
│   │       ├── webhooks/
│   │       │   ├── stripe/
│   │       │   │   └── route.ts       # Stripe webhook handler
│   │       │   └── clerk/
│   │       │       └── route.ts       # Clerk webhook (user.created → create customer)
│   │       │
│   │       ├── instances/
│   │       │   ├── route.ts           # GET (list), POST (create)
│   │       │   └── [instanceId]/
│   │       │       ├── route.ts       # GET (detail), DELETE (destroy), PATCH (update)
│   │       │       └── actions/
│   │       │           └── route.ts   # POST { action: "start"|"stop"|"restart" }
│   │       │
│   │       ├── billing/
│   │       │   ├── portal/
│   │       │   │   └── route.ts       # POST → create Stripe portal session
│   │       │   ├── usage/
│   │       │   │   └── route.ts       # GET → current period usage summary
│   │       │   └── subscription/
│   │       │       └── route.ts       # POST → create/update subscription
│   │       │
│   │       └── health/
│   │           └── [instanceId]/
│   │               └── route.ts       # GET → poll instance health
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives (button, card, dialog, etc.)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── separator.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # Dashboard sidebar nav
│   │   │   ├── topbar.tsx             # User button, breadcrumbs
│   │   │   └── mobile-nav.tsx         # Sheet-based mobile nav
│   │   │
│   │   ├── instances/
│   │   │   ├── instance-card.tsx      # Card for instance list
│   │   │   ├── instance-status.tsx    # Status badge (running/stopped/error/provisioning)
│   │   │   ├── create-instance-form.tsx
│   │   │   ├── instance-actions.tsx   # Start/Stop/Restart/Delete buttons
│   │   │   ├── instance-overview.tsx  # Detail view header
│   │   │   └── instance-settings-form.tsx
│   │   │
│   │   ├── billing/
│   │   │   ├── usage-chart.tsx        # Bar chart — daily token spend
│   │   │   ├── usage-by-model.tsx     # Table — breakdown per model
│   │   │   ├── current-spend.tsx      # Big number card — month-to-date
│   │   │   ├── plan-card.tsx          # Current plan + upgrade CTA
│   │   │   └── billing-portal-button.tsx
│   │   │
│   │   └── shared/
│   │       ├── loading.tsx            # Full-page spinner
│   │       ├── error-boundary.tsx
│   │       ├── empty-state.tsx        # "No instances yet" illustration
│   │       └── confirm-dialog.tsx     # Destructive action confirmation
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              # Drizzle client (Supabase connection)
│   │   │   ├── schema.ts             # Drizzle schema definitions
│   │   │   └── migrations/           # Drizzle migration files
│   │   │       └── 0000_initial.sql
│   │   │
│   │   ├── stripe/
│   │   │   ├── client.ts             # Stripe SDK instance
│   │   │   ├── products.ts           # Plan → Stripe price ID mapping
│   │   │   ├── subscriptions.ts      # createSubscription, cancelSubscription, updatePlan
│   │   │   ├── portal.ts             # createPortalSession
│   │   │   ├── webhooks.ts           # verifyWebhookSignature, handleEvent dispatcher
│   │   │   └── usage.ts              # fetchMeterEvents, getCustomerUsageSummary
│   │   │
│   │   ├── hetzner/
│   │   │   ├── client.ts             # Hetzner Cloud API client (fetch-based)
│   │   │   ├── servers.ts            # createServer, deleteServer, getServer, powerOn/Off/Reset
│   │   │   ├── cloud-init.ts         # generateCloudInit(config: InstanceConfig) → string
│   │   │   └── types.ts              # Hetzner API response types
│   │   │
│   │   ├── openclaw/
│   │   │   ├── config.ts             # generateOpenClawConfig(instance, customer) → JSON
│   │   │   └── health.ts             # checkInstanceHealth(ip: string) → HealthStatus
│   │   │
│   │   ├── auth.ts                   # currentUser(), requireAuth() helpers wrapping Clerk
│   │   ├── constants.ts              # Plan definitions, regions, server types
│   │   └── utils.ts                  # slugify, formatCurrency, cn()
│   │
│   ├── hooks/
│   │   ├── use-instances.ts          # SWR hook: fetch/mutate instances
│   │   ├── use-instance.ts           # SWR hook: single instance
│   │   ├── use-usage.ts              # SWR hook: billing usage data
│   │   └── use-polling.ts            # Generic polling hook for health checks
│   │
│   └── types/
│       ├── instance.ts               # Instance, InstanceStatus, InstancePlan types
│       ├── billing.ts                # UsageSummary, UsageByModel, PlanInfo types
│       └── api.ts                    # ApiResponse<T>, ApiError types
│
├── supabase/
│   ├── config.toml                   # Supabase local dev config
│   └── migrations/
│       ├── 20260311000001_create_customers.sql
│       ├── 20260311000002_create_instances.sql
│       ├── 20260311000003_create_usage_events.sql
│       ├── 20260311000004_create_instance_events.sql
│       └── 20260311000005_rls_policies.sql
│
└── scripts/
    ├── seed.ts                        # Dev seed data
    └── sync-stripe-products.ts        # One-time: create Stripe products/prices
```

---

## 2. Database Schema + Migrations

### Migration 1: `20260311000001_create_customers.sql`

```sql
CREATE TABLE public.customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  stripe_customer_id TEXT UNIQUE,
  plan          TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'business')),
  max_instances INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_clerk ON customers(clerk_user_id);
CREATE INDEX idx_customers_stripe ON customers(stripe_customer_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Migration 2: `20260311000002_create_instances.sql`

```sql
CREATE TYPE instance_status AS ENUM (
  'provisioning', 'running', 'stopped', 'error', 'deleting', 'deleted'
);

CREATE TYPE instance_plan AS ENUM ('starter', 'pro', 'business');

CREATE TYPE instance_region AS ENUM (
  'eu-central',   -- Falkenstein
  'eu-west',      -- Helsinki
  'us-east',      -- Ashburn
  'us-west'       -- Hillsboro
);

CREATE TABLE public.instances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  status                instance_status NOT NULL DEFAULT 'provisioning',
  plan                  instance_plan NOT NULL DEFAULT 'starter',
  region                instance_region NOT NULL DEFAULT 'eu-central',

  -- Hetzner
  hetzner_server_id     BIGINT,
  hetzner_server_type   TEXT,            -- cx22, cx32, cx42
  ip_address            INET,

  -- Stripe
  stripe_subscription_id      TEXT,
  stripe_subscription_item_id TEXT,      -- for the base plan line item

  -- Config
  config                JSONB NOT NULL DEFAULT '{}'::jsonb,
  env_vars              JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  provisioned_at        TIMESTAMPTZ,
  last_health_check     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instances_customer ON instances(customer_id);
CREATE INDEX idx_instances_status ON instances(status);
CREATE INDEX idx_instances_slug ON instances(slug);

CREATE TRIGGER instances_updated_at
  BEFORE UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Migration 3: `20260311000003_create_usage_events.sql`

```sql
CREATE TABLE public.usage_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  billed_usd    NUMERIC(10, 6) NOT NULL DEFAULT 0,
  stripe_meter_event_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_customer ON usage_events(customer_id);
CREATE INDEX idx_usage_instance ON usage_events(instance_id);
CREATE INDEX idx_usage_created ON usage_events(created_at);
CREATE INDEX idx_usage_customer_period ON usage_events(customer_id, created_at);
```

### Migration 4: `20260311000004_create_instance_events.sql`

```sql
CREATE TABLE public.instance_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL
    CHECK (event_type IN (
      'created', 'provisioning', 'provisioned', 'started',
      'stopped', 'restarted', 'error', 'deleting', 'deleted',
      'config_updated', 'plan_changed'
    )),
  details       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_instance ON instance_events(instance_id);
CREATE INDEX idx_events_type ON instance_events(event_type);
```

### Migration 5: `20260311000005_rls_policies.sql`

```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_events ENABLE ROW LEVEL SECURITY;

-- Customers: users can only read/update their own row
-- (clerk_user_id is set via auth.jwt() -> 'sub')
CREATE POLICY customers_select ON customers
  FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY customers_update ON customers
  FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Instances: users can only access their own instances
CREATE POLICY instances_select ON instances
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY instances_insert ON instances
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY instances_update ON instances
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY instances_delete ON instances
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Usage events: read-only for own data
CREATE POLICY usage_select ON usage_events
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Instance events: read-only for own instances
CREATE POLICY events_select ON instance_events
  FOR SELECT USING (
    instance_id IN (
      SELECT i.id FROM instances i
      JOIN customers c ON i.customer_id = c.id
      WHERE c.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Service role bypasses RLS (used by API routes via supabase service key)
```

---

## 3. API Routes — Full Specification

### 3.1 Clerk Webhook: `POST /api/webhooks/clerk`

**File:** `src/app/api/webhooks/clerk/route.ts`

```typescript
import { Webhook } from 'svix'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { stripe } from '@/lib/stripe/client'

export async function POST(req: Request) {
  // 1. Verify Svix signature (Clerk uses Svix for webhooks)
  // 2. Parse event
  // 3. Handle "user.created":
  //    a. Create Stripe customer: stripe.customers.create({ email, name, metadata: { clerk_user_id } })
  //    b. Insert into customers table: { clerk_user_id, email, name, stripe_customer_id }
  // 4. Handle "user.updated": sync email/name changes
  // 5. Handle "user.deleted": soft-delete or flag customer
  // Return 200
}
```

### 3.2 Stripe Webhook: `POST /api/webhooks/stripe`

**File:** `src/app/api/webhooks/stripe/route.ts`

```typescript
import { stripe } from '@/lib/stripe/client'
import { handleStripeEvent } from '@/lib/stripe/webhooks'

export async function POST(req: Request) {
  // 1. Read raw body
  // 2. Verify signature via stripe.webhooks.constructEvent(body, sig, secret)
  // 3. Dispatch to handleStripeEvent(event)
  // Return 200
}
```

**Events handled in `src/lib/stripe/webhooks.ts`:**

| Event | Handler |
|-------|---------|
| `customer.subscription.created` | Update instance `stripe_subscription_id`, log event |
| `customer.subscription.updated` | Sync plan changes, update `max_instances` |
| `customer.subscription.deleted` | Set instance status → `stopped`, log event |
| `invoice.paid` | Log successful payment, update `last_paid_at` on customer |
| `invoice.payment_failed` | Flag customer, send warning, suspend after grace period |
| `billing_meter.usage_report` | Mirror usage data into `usage_events` table (optional — for dashboard) |

```typescript
// src/lib/stripe/webhooks.ts
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
      return handleSubscriptionCreated(event.data.object as Stripe.Subscription)
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
    case 'invoice.paid':
      return handleInvoicePaid(event.data.object as Stripe.Invoice)
    case 'invoice.payment_failed':
      return handlePaymentFailed(event.data.object as Stripe.Invoice)
  }
}

async function handleSubscriptionCreated(sub: Stripe.Subscription): Promise<void> {
  // Find instance by metadata.instance_id on the subscription
  // Update instance.stripe_subscription_id = sub.id
  // Update instance.stripe_subscription_item_id = sub.items.data[0].id
  // Log instance_event: 'created'
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  // Find instance by stripe_subscription_id
  // Set instance.status = 'stopped'
  // Power off Hetzner server (don't delete yet — grace period)
  // Log instance_event: 'stopped'
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // Find customer by stripe_customer_id = invoice.customer
  // If past grace period (3 days): stop all instances
  // Log event
}
```

### 3.3 Instances API

#### `GET /api/instances` — List user's instances

**File:** `src/app/api/instances/route.ts`

```typescript
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { instances } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: Request) {
  const customer = await requireAuth()
  // SELECT * FROM instances WHERE customer_id = customer.id AND status != 'deleted'
  // ORDER BY created_at DESC
  // Return: { instances: Instance[] }
}
```

#### `POST /api/instances` — Create new instance

```typescript
export async function POST(req: Request) {
  const customer = await requireAuth()
  const body = await req.json()
  // body: { name: string, plan: 'starter'|'pro'|'business', region: string }

  // 1. Validate: check instance count < customer.max_instances
  // 2. Generate slug from name (slugify + random suffix)
  // 3. Insert instance row (status: 'provisioning')
  // 4. Create Stripe subscription (see §3.5)
  // 5. Kick off provisioning (see §4 Control Plane)
  // 6. Return: { instance: Instance }

  // Provisioning is async — client polls for status change
}
```

**Detailed create flow (inside POST handler):**

```typescript
async function createInstance(customer: Customer, input: CreateInstanceInput): Promise<Instance> {
  const slug = generateSlug(input.name)

  // Step 1: Insert DB row
  const [instance] = await db.insert(instances).values({
    customer_id: customer.id,
    name: input.name,
    slug,
    plan: input.plan,
    region: input.region,
    status: 'provisioning',
  }).returning()

  // Step 2: Create Stripe subscription
  const subscription = await createSubscription({
    customerId: customer.stripe_customer_id!,
    priceId: PLAN_PRICES[input.plan],
    metadata: { instance_id: instance.id, customer_id: customer.id },
  })

  // Step 3: Update instance with Stripe IDs
  await db.update(instances)
    .set({
      stripe_subscription_id: subscription.id,
      stripe_subscription_item_id: subscription.items.data[0].id,
    })
    .where(eq(instances.id, instance.id))

  // Step 4: Provision VPS (async, non-blocking)
  provisionInstance(instance, customer).catch(async (err) => {
    await db.update(instances)
      .set({ status: 'error' })
      .where(eq(instances.id, instance.id))
    await logInstanceEvent(instance.id, 'error', { error: err.message })
  })

  // Step 5: Log event
  await logInstanceEvent(instance.id, 'created', { plan: input.plan, region: input.region })

  return instance
}
```

#### `GET /api/instances/[instanceId]` — Instance detail

```typescript
// src/app/api/instances/[instanceId]/route.ts
export async function GET(req: Request, { params }: { params: { instanceId: string } }) {
  const customer = await requireAuth()
  // SELECT * FROM instances WHERE id = params.instanceId AND customer_id = customer.id
  // 404 if not found
  // Return: { instance: Instance }
}
```

#### `PATCH /api/instances/[instanceId]` — Update instance config

```typescript
export async function PATCH(req: Request, { params }: { params: { instanceId: string } }) {
  const customer = await requireAuth()
  const body = await req.json()
  // body: { name?, config?, env_vars? }

  // 1. Verify ownership
  // 2. Update DB row
  // 3. If config or env_vars changed: regenerate openclaw.json and push to VPS via SSH
  // 4. Restart OpenClaw container on VPS
  // 5. Log instance_event: 'config_updated'
  // Return: { instance: Instance }
}
```

#### `DELETE /api/instances/[instanceId]` — Destroy instance

```typescript
export async function DELETE(req: Request, { params }: { params: { instanceId: string } }) {
  const customer = await requireAuth()

  // 1. Verify ownership
  // 2. Set status = 'deleting'
  // 3. Cancel Stripe subscription (immediately)
  // 4. Delete Hetzner server
  // 5. Set status = 'deleted'
  // 6. Log instance_event: 'deleted'
  // Return: 204
}
```

#### `POST /api/instances/[instanceId]/actions` — Lifecycle actions

```typescript
// src/app/api/instances/[instanceId]/actions/route.ts
export async function POST(req: Request, { params }: { params: { instanceId: string } }) {
  const customer = await requireAuth()
  const { action } = await req.json()
  // action: 'start' | 'stop' | 'restart'

  // 1. Verify ownership
  // 2. Validate state transition (can't start a 'provisioning' instance, etc.)
  // 3. Call Hetzner API:
  //    - start  → POST /servers/{id}/actions/poweron
  //    - stop   → POST /servers/{id}/actions/shutdown
  //    - restart → POST /servers/{id}/actions/reset
  // 4. Update instance status
  // 5. Log instance_event
  // Return: { instance: Instance }
}
```

### 3.4 Billing API

#### `POST /api/billing/portal` — Stripe Customer Portal

```typescript
// src/app/api/billing/portal/route.ts
export async function POST(req: Request) {
  const customer = await requireAuth()

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id!,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })

  return Response.json({ url: session.url })
}
```

#### `GET /api/billing/usage` — Usage summary

```typescript
// src/app/api/billing/usage/route.ts
export async function GET(req: Request) {
  const customer = await requireAuth()
  const { searchParams } = new URL(req.url)
  const instanceId = searchParams.get('instanceId')  // optional filter
  const period = searchParams.get('period') ?? 'current'  // 'current' | '2026-02' etc.

  // 1. Determine date range for period
  // 2. Query usage_events grouped by model:
  //    SELECT model, SUM(input_tokens), SUM(output_tokens), SUM(billed_usd)
  //    FROM usage_events
  //    WHERE customer_id = ? AND created_at BETWEEN ? AND ?
  //    [AND instance_id = ?]
  //    GROUP BY model
  //
  // 3. Also query daily totals for chart:
  //    SELECT DATE(created_at) as day, SUM(billed_usd) as total
  //    FROM usage_events
  //    WHERE customer_id = ? AND created_at BETWEEN ? AND ?
  //    GROUP BY DATE(created_at)
  //    ORDER BY day
  //
  // 4. Get base subscription cost from Stripe
  //
  // Return: {
  //   period: { start, end },
  //   base_cost: number,
  //   token_cost: number,
  //   total_cost: number,
  //   by_model: [{ model, input_tokens, output_tokens, cost }],
  //   daily: [{ date, cost }]
  // }
}
```

#### `POST /api/billing/subscription` — Create/change subscription

```typescript
// src/app/api/billing/subscription/route.ts
export async function POST(req: Request) {
  const customer = await requireAuth()
  const { plan, instanceId } = await req.json()

  // For plan change on existing instance:
  // 1. Retrieve current subscription
  // 2. stripe.subscriptions.update(subId, { items: [{ id: itemId, price: newPriceId }] })
  // 3. Update instance.plan in DB
  // 4. If server type needs to change: schedule Hetzner server resize
  // 5. Log instance_event: 'plan_changed'
}
```

### 3.5 Health Check API

```typescript
// src/app/api/health/[instanceId]/route.ts
export async function GET(req: Request, { params }: { params: { instanceId: string } }) {
  const customer = await requireAuth()

  // 1. Verify ownership
  // 2. Get instance IP
  // 3. Call checkInstanceHealth(ip):
  //    - HTTP GET http://{ip}:3000/health (OpenClaw health endpoint)
  //    - Timeout: 5s
  //    - Return: { status: 'healthy'|'unhealthy'|'unreachable', latency_ms, details }
  // 4. Update instance.last_health_check
  // Return: { health: HealthStatus }
}
```

---

## 4. Control Plane — Hetzner VPS Provisioning

### 4.1 Hetzner API Client

**File:** `src/lib/hetzner/client.ts`

```typescript
const HETZNER_API_BASE = 'https://api.hetzner.cloud/v1'

export async function hetznerFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${HETZNER_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.HETZNER_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new HetznerApiError(res.status, body)
  }
  return res.json()
}
```

### 4.2 Server Operations

**File:** `src/lib/hetzner/servers.ts`

```typescript
interface CreateServerParams {
  name: string                    // "clawcloud-{slug}"
  serverType: string              // cx22 | cx32 | cx42
  location: string                // fsn1 | hel1 | ash | hil
  image: string                   // "ubuntu-24.04"
  sshKeys: string[]               // Hetzner SSH key IDs
  userData: string                // cloud-init YAML
  labels: Record<string, string>  // { customer_id, instance_id, env: 'production' }
}

export async function createServer(params: CreateServerParams): Promise<HetznerServer> {
  return hetznerFetch<{ server: HetznerServer }>('/servers', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      server_type: params.serverType,
      location: params.location,
      image: params.image,
      ssh_keys: params.sshKeys,
      user_data: params.userData,
      labels: params.labels,
      start_after_create: true,
    }),
  }).then(r => r.server)
}

export async function deleteServer(serverId: number): Promise<void> {
  await hetznerFetch(`/servers/${serverId}`, { method: 'DELETE' })
}

export async function getServer(serverId: number): Promise<HetznerServer> {
  return hetznerFetch<{ server: HetznerServer }>(`/servers/${serverId}`)
    .then(r => r.server)
}

export async function serverAction(
  serverId: number,
  action: 'poweron' | 'shutdown' | 'reset'
): Promise<void> {
  await hetznerFetch(`/servers/${serverId}/actions/${action}`, { method: 'POST' })
}
```

### 4.3 Plan → Hetzner Server Type Mapping

**File:** `src/lib/constants.ts`

```typescript
export const PLANS = {
  starter: {
    name: 'Starter',
    price_eur: 9,
    vcpu: 1,
    ram_gb: 1,
    hetzner_type: 'cx22',       // 2 vCPU, 4GB — smallest shared (Hetzner min)
    max_instances: 1,
    markup_pct: 30,
    stripe_price_id: process.env.STRIPE_PRICE_STARTER!,
  },
  pro: {
    name: 'Pro',
    price_eur: 29,
    vcpu: 2,
    ram_gb: 4,
    hetzner_type: 'cx32',       // 4 vCPU, 8GB
    max_instances: 3,
    markup_pct: 25,
    stripe_price_id: process.env.STRIPE_PRICE_PRO!,
  },
  business: {
    name: 'Business',
    price_eur: 79,
    vcpu: 4,
    ram_gb: 8,
    hetzner_type: 'cx42',       // 8 vCPU, 16GB
    max_instances: 10,
    markup_pct: 20,
    stripe_price_id: process.env.STRIPE_PRICE_BUSINESS!,
  },
} as const

export type PlanKey = keyof typeof PLANS

export const REGIONS = {
  'eu-central': { hetzner: 'fsn1', label: 'EU Central (Falkenstein)' },
  'eu-west':    { hetzner: 'hel1', label: 'EU West (Helsinki)' },
  'us-east':    { hetzner: 'ash',  label: 'US East (Ashburn)' },
  'us-west':    { hetzner: 'hil',  label: 'US West (Hillsboro)' },
} as const
```

### 4.4 Cloud-Init Template

**File:** `src/lib/hetzner/cloud-init.ts`

```typescript
interface CloudInitParams {
  instanceId: string
  customerId: string
  stripeCustomerId: string
  aiGatewayApiKey: string
  stripeRestrictedKey: string
  openclawConfig: string          // JSON string of openclaw.json
  openclawVersion: string         // Docker tag, e.g. "latest" or "0.5.2"
  sshPublicKey?: string           // Customer's SSH key for non-root access
}

export function generateCloudInit(params: CloudInitParams): string {
  return `#cloud-config
package_update: true
packages:
  - docker.io
  - docker-compose-v2
  - curl
  - jq

users:
  - name: openclaw
    shell: /bin/bash
    groups: docker
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${params.sshPublicKey ?? ''}

write_files:
  - path: /opt/openclaw/.env
    permissions: '0600'
    content: |
      AI_GATEWAY_URL=https://gateway.ai.vercel.app/v1
      AI_GATEWAY_API_KEY=${params.aiGatewayApiKey}
      STRIPE_CUSTOMER_ID=${params.stripeCustomerId}
      STRIPE_RESTRICTED_KEY=${params.stripeRestrictedKey}
      INSTANCE_ID=${params.instanceId}
      CUSTOMER_ID=${params.customerId}

  - path: /opt/openclaw/openclaw.json
    permissions: '0644'
    content: |
      ${params.openclawConfig}

  - path: /opt/openclaw/docker-compose.yml
    permissions: '0644'
    content: |
      services:
        openclaw:
          image: openclaw/openclaw:${params.openclawVersion}
          container_name: openclaw
          restart: always
          env_file: .env
          volumes:
            - ./openclaw.json:/home/openclaw/.openclaw/openclaw.json
            - ./workspace:/home/openclaw/workspace
          ports:
            - "3000:3000"
          healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
            interval: 30s
            timeout: 10s
            retries: 3

  - path: /opt/openclaw/health-reporter.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      # Simple health endpoint for the control plane to poll
      while true; do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' openclaw 2>/dev/null || echo "not_running")
        echo "$STATUS" > /opt/openclaw/health-status
        sleep 30
      done

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - cd /opt/openclaw && docker compose pull
  - cd /opt/openclaw && docker compose up -d
  - nohup /opt/openclaw/health-reporter.sh &
`
}
```

### 4.5 Provisioning Orchestrator

**File:** `src/lib/hetzner/servers.ts` (continued) / or `src/lib/control-plane.ts`

```typescript
// src/lib/control-plane.ts

import { createServer, getServer } from '@/lib/hetzner/servers'
import { generateCloudInit } from '@/lib/hetzner/cloud-init'
import { generateOpenClawConfig } from '@/lib/openclaw/config'
import { checkInstanceHealth } from '@/lib/openclaw/health'
import { db } from '@/lib/db'
import { instances, instance_events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { PLANS, REGIONS } from '@/lib/constants'

export async function provisionInstance(
  instance: Instance,
  customer: Customer
): Promise<void> {
  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]

  // 1. Generate OpenClaw config JSON
  const openclawConfig = generateOpenClawConfig(instance, customer)

  // 2. Generate cloud-init
  const userData = generateCloudInit({
    instanceId: instance.id,
    customerId: customer.id,
    stripeCustomerId: customer.stripe_customer_id!,
    aiGatewayApiKey: process.env.VERCEL_AI_GATEWAY_KEY!,
    stripeRestrictedKey: process.env.STRIPE_RESTRICTED_ACCESS_KEY!,
    openclawConfig: JSON.stringify(openclawConfig, null, 2),
    openclawVersion: process.env.OPENCLAW_VERSION ?? 'latest',
  })

  // 3. Create Hetzner server
  const server = await createServer({
    name: `clawcloud-${instance.slug}`,
    serverType: plan.hetzner_type,
    location: region.hetzner,
    image: 'ubuntu-24.04',
    sshKeys: [process.env.HETZNER_SSH_KEY_ID!],
    userData,
    labels: {
      customer_id: customer.id,
      instance_id: instance.id,
      env: process.env.NODE_ENV ?? 'production',
    },
  })

  // 4. Update instance with server details
  await db.update(instances).set({
    hetzner_server_id: server.id,
    hetzner_server_type: plan.hetzner_type,
    ip_address: server.public_net.ipv4.ip,
  }).where(eq(instances.id, instance.id))

  // 5. Poll for health (max 5 minutes)
  const healthy = await waitForHealth(server.public_net.ipv4.ip, {
    maxAttempts: 30,
    intervalMs: 10_000,
  })

  if (healthy) {
    await db.update(instances).set({
      status: 'running',
      provisioned_at: new Date(),
    }).where(eq(instances.id, instance.id))

    await logInstanceEvent(instance.id, 'provisioned', {
      server_id: server.id,
      ip: server.public_net.ipv4.ip,
    })
  } else {
    await db.update(instances).set({ status: 'error' })
      .where(eq(instances.id, instance.id))

    await logInstanceEvent(instance.id, 'error', {
      reason: 'Health check timeout after provisioning',
    })
  }
}

async function waitForHealth(
  ip: string,
  opts: { maxAttempts: number; intervalMs: number }
): Promise<boolean> {
  for (let i = 0; i < opts.maxAttempts; i++) {
    await new Promise(r => setTimeout(r, opts.intervalMs))
    const health = await checkInstanceHealth(ip)
    if (health.status === 'healthy') return true
  }
  return false
}
```

### 4.6 Instance Health Check

**File:** `src/lib/openclaw/health.ts`

```typescript
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unreachable'
  latency_ms: number
  details?: Record<string, unknown>
}

export async function checkInstanceHealth(ip: string): Promise<HealthStatus> {
  const start = Date.now()
  try {
    const res = await fetch(`http://${ip}:3000/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    if (res.ok) {
      const body = await res.json().catch(() => ({}))
      return { status: 'healthy', latency_ms: latency, details: body }
    }
    return { status: 'unhealthy', latency_ms: latency }
  } catch {
    return { status: 'unreachable', latency_ms: Date.now() - start }
  }
}
```

---

## 5. Stripe Integration

### 5.1 Stripe Client

**File:** `src/lib/stripe/client.ts`

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-18.acacia',
  typescript: true,
})
```

### 5.2 Products & Prices Setup Script

**File:** `scripts/sync-stripe-products.ts`

Run once to create Stripe products and prices:

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function setup() {
  // 1. Create product: "ClawCloud Instance"
  const product = await stripe.products.create({
    name: 'ClawCloud Instance',
    description: 'Managed OpenClaw instance',
  })

  // 2. Create prices for each plan
  const starterPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 900,       // €9.00
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'starter' },
  })

  const proPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 2900,      // €29.00
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro' },
  })

  const businessPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 7900,      // €79.00
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { plan: 'business' },
  })

  // 3. Create billing meter for token usage
  const meter = await stripe.billing.meters.create({
    display_name: 'AI Token Usage',
    event_name: 'token-billing-tokens',
    default_aggregation: { formula: 'sum' },
    value_settings: { event_payload_key: 'value' },
  })

  // 4. Create metered price for token usage
  const tokenPrice = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    recurring: {
      interval: 'month',
      usage_type: 'metered',
      meter: meter.id,
    },
    unit_amount_decimal: '0.003',  // €0.003 per token (adjusted with markup)
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
}

setup()
```

### 5.3 Subscription Management

**File:** `src/lib/stripe/subscriptions.ts`

```typescript
import { stripe } from './client'
import { PLANS } from '@/lib/constants'

interface CreateSubscriptionParams {
  customerId: string         // Stripe customer ID
  priceId: string            // Plan price ID
  metadata: {
    instance_id: string
    customer_id: string
  }
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [
      { price: params.priceId },                              // Base plan
      { price: process.env.STRIPE_PRICE_TOKEN_USAGE! },       // Metered token usage
    ],
    metadata: params.metadata,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  })
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.cancel(subscriptionId)
}

export async function updateSubscriptionPlan(
  subscriptionId: string,
  currentItemId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: currentItemId, price: newPriceId }],
    proration_behavior: 'always_invoice',
  })
}
```

### 5.4 Customer Portal

**File:** `src/lib/stripe/portal.ts`

```typescript
import { stripe } from './client'

export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })
  return session.url
}
```

### 5.5 Usage Querying

**File:** `src/lib/stripe/usage.ts`

```typescript
import { db } from '@/lib/db'
import { usage_events } from '@/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

export interface UsageSummary {
  period: { start: Date; end: Date }
  base_cost: number
  token_cost: number
  total_cost: number
  by_model: Array<{
    model: string
    input_tokens: number
    output_tokens: number
    cost: number
  }>
  daily: Array<{
    date: string
    cost: number
  }>
}

export async function getCustomerUsageSummary(
  customerId: string,
  periodStart: Date,
  periodEnd: Date,
  instanceId?: string
): Promise<UsageSummary> {
  const conditions = [
    eq(usage_events.customer_id, customerId),
    gte(usage_events.created_at, periodStart),
    lte(usage_events.created_at, periodEnd),
  ]
  if (instanceId) {
    conditions.push(eq(usage_events.instance_id, instanceId))
  }

  const byModel = await db
    .select({
      model: usage_events.model,
      input_tokens: sql<number>`SUM(${usage_events.input_tokens})`,
      output_tokens: sql<number>`SUM(${usage_events.output_tokens})`,
      cost: sql<number>`SUM(${usage_events.billed_usd})`,
    })
    .from(usage_events)
    .where(and(...conditions))
    .groupBy(usage_events.model)

  const daily = await db
    .select({
      date: sql<string>`DATE(${usage_events.created_at})`,
      cost: sql<number>`SUM(${usage_events.billed_usd})`,
    })
    .from(usage_events)
    .where(and(...conditions))
    .groupBy(sql`DATE(${usage_events.created_at})`)
    .orderBy(sql`DATE(${usage_events.created_at})`)

  const tokenCost = byModel.reduce((sum, m) => sum + Number(m.cost), 0)

  return {
    period: { start: periodStart, end: periodEnd },
    base_cost: 0,  // filled by caller from Stripe subscription
    token_cost: tokenCost,
    total_cost: tokenCost,  // caller adds base_cost
    by_model,
    daily,
  }
}
```

---

## 6. Vercel AI Gateway — Per-Instance Config Generation

### 6.1 OpenClaw Config Generator

**File:** `src/lib/openclaw/config.ts`

Each OpenClaw instance gets a `openclaw.json` that routes all LLM calls through Vercel AI Gateway with Stripe billing headers.

```typescript
interface OpenClawConfig {
  models: {
    providers: Record<string, {
      apiKey: string
      baseUrl: string
      headers: Record<string, string>
    }>
    default: string
    available: string[]
  }
}

export function generateOpenClawConfig(
  instance: Instance,
  customer: Customer
): OpenClawConfig {
  return {
    models: {
      providers: {
        "vercel-ai-gateway": {
          apiKey: "${AI_GATEWAY_API_KEY}",
          baseUrl: "https://gateway.ai.vercel.app/v1",
          headers: {
            "stripe-customer-id": customer.stripe_customer_id!,
            "stripe-restricted-access-key": "${STRIPE_RESTRICTED_KEY}",
          },
        },
      },
      default: "vercel-ai-gateway/anthropic/claude-sonnet-4.6",
      available: [
        "vercel-ai-gateway/anthropic/claude-sonnet-4.6",
        "vercel-ai-gateway/anthropic/claude-opus-4.6",
        "vercel-ai-gateway/openai/gpt-4o",
        "vercel-ai-gateway/openai/o3-mini",
        "vercel-ai-gateway/google/gemini-2.5-pro",
      ],
    },
  }
}
```

**How it works end-to-end:**

1. OpenClaw instance makes an LLM call (e.g., user asks a question)
2. OpenClaw reads `openclaw.json` → sees provider is `vercel-ai-gateway`
3. Request goes to `https://gateway.ai.vercel.app/v1` with headers:
   - `Authorization: Bearer {AI_GATEWAY_API_KEY}`
   - `stripe-customer-id: cus_ABC123`
   - `stripe-restricted-access-key: rk_live_XYZ`
4. Vercel AI Gateway routes to the actual model provider (Anthropic, OpenAI, etc.)
5. On response, Vercel emits two Stripe meter events:
   - `{ event_name: "token-billing-tokens", payload: { stripe_customer_id: "cus_ABC123", value: "1500", token_type: "input", model: "anthropic/claude-sonnet-4.6" } }`
   - `{ event_name: "token-billing-tokens", payload: { stripe_customer_id: "cus_ABC123", value: "300", token_type: "output", model: "anthropic/claude-sonnet-4.6" } }`
6. Stripe adds these to the customer's running invoice under the metered line item
7. At billing cycle end, Stripe charges: base plan + accumulated token usage

---

## 7. Dashboard Pages — Component Breakdown

### 7.1 Root Layout (`src/app/layout.tsx`)

```typescript
// Wraps: ClerkProvider, ThemeProvider (next-themes), Toaster (sonner)
// Font: Inter via next/font/google
// Metadata: title, description, og:image
```

### 7.2 Auth Pages

| Page | Route | Components |
|------|-------|------------|
| Sign In | `/sign-in` | `<SignIn />` from `@clerk/nextjs` |
| Sign Up | `/sign-up` | `<SignUp />` from `@clerk/nextjs` |

Centered layout with logo, dark background.

### 7.3 Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

```
┌──────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌──────────────────────────────────────┐ │
│ │ Sidebar  │ │ Topbar (breadcrumbs + UserButton)   │ │
│ │          │ ├──────────────────────────────────────┤ │
│ │ Logo     │ │                                      │ │
│ │          │ │  Page Content                        │ │
│ │ Nav:     │ │                                      │ │
│ │ Instances│ │                                      │ │
│ │ Billing  │ │                                      │ │
│ │ Settings │ │                                      │ │
│ │          │ │                                      │ │
│ │          │ │                                      │ │
│ └─────────┘ └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Sidebar items:**
- Instances (icon: Server)
- Billing (icon: CreditCard)
- Settings (icon: Settings)
- Docs (icon: ExternalLink, opens docs site)

### 7.4 Instances List (`/instances`)

**Components:**
- `InstanceCard` — card per instance showing:
  - Name + slug
  - `InstanceStatus` badge (green=running, yellow=provisioning, red=error, gray=stopped)
  - Plan badge (Starter/Pro/Business)
  - Region
  - IP address (copyable)
  - Created date
  - Quick actions: Start/Stop, Open detail
- `EmptyState` — "No instances yet. Create your first one."
- `Button` → links to `/instances/new`

**Data fetching:** Server component, fetches from DB directly (no API call needed).

```typescript
// src/app/(dashboard)/instances/page.tsx
export default async function InstancesPage() {
  const customer = await requireAuth()
  const userInstances = await db.query.instances.findMany({
    where: and(
      eq(instances.customer_id, customer.id),
      ne(instances.status, 'deleted')
    ),
    orderBy: desc(instances.created_at),
  })
  return <InstancesList instances={userInstances} />
}
```

### 7.5 Create Instance (`/instances/new`)

**Components:**
- `CreateInstanceForm` — client component with:
  - Name input (validates uniqueness via slug)
  - Plan selector (3 cards: Starter/Pro/Business with specs)
  - Region selector (dropdown: EU Central, EU West, US East, US West)
  - Submit button → POST `/api/instances`
  - On success: redirect to `/instances/[id]` (shows provisioning state)

**Form validation:** Zod schema

```typescript
const createInstanceSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-zA-Z0-9\s-]+$/),
  plan: z.enum(['starter', 'pro', 'business']),
  region: z.enum(['eu-central', 'eu-west', 'us-east', 'us-west']),
})
```

### 7.6 Instance Detail (`/instances/[instanceId]`)

**Tabs layout** (using URL segments):

| Tab | Route | Content |
|-----|-------|---------|
| Overview | `/instances/[id]` | Status, IP, uptime, server specs, quick actions |
| Settings | `/instances/[id]/settings` | Config editor, env vars, danger zone (delete) |
| Usage | `/instances/[id]/usage` | Token usage chart + model breakdown for this instance |
| Logs | `/instances/[id]/logs` | Placeholder for Phase 3 |

**Overview page components:**
- `InstanceOverview` — header with name, status badge, action buttons
- Status card: running since, last health check, latency
- Server info card: IP (copyable), region, plan, vCPU/RAM
- Quick actions: Start, Stop, Restart, Open SSH (Phase 3)
- Health indicator: polls `GET /api/health/[id]` every 30s

**Settings page components:**
- `InstanceSettingsForm`:
  - Instance name (editable)
  - Model preferences (default model dropdown)
  - Environment variables (key-value editor)
  - Danger zone: Delete instance (with `ConfirmDialog`)

**Usage page components:**
- `UsageChart` — recharts BarChart of daily spend
- `UsageByModel` — table with model, input tokens, output tokens, cost
- Period selector (current month, previous months)

### 7.7 Billing Page (`/billing`)

**Components:**
- `CurrentSpend` — big number card: "€41.40 this month"
  - Breakdown: "€29.00 compute + €12.40 AI usage"
- `PlanCard` — current plan with upgrade/downgrade buttons
- `UsageChart` — aggregate across all instances
- `UsageByModel` — aggregate model breakdown
- `BillingPortalButton` — "Manage Payment Methods & Invoices" → Stripe portal

### 7.8 Account Settings (`/settings`)

**Components:**
- SSH public keys manager (add/remove keys — stored in `customers.config`)
- Profile info (from Clerk, read-only or link to Clerk profile)
- API keys section (Phase 3 placeholder)

---

## 8. Key Data Flows

### 8.1 Instance Creation Flow

```
User fills form → Submit
    │
    ▼
POST /api/instances
    │
    ├─ Validate input (Zod)
    ├─ Check instance count < max_instances
    ├─ Generate slug
    │
    ├─ INSERT into instances (status: 'provisioning')
    │
    ├─ stripe.subscriptions.create({
    │     customer: stripe_customer_id,
    │     items: [base_plan_price, token_usage_price],
    │     metadata: { instance_id, customer_id }
    │   })
    │
    ├─ UPDATE instance SET stripe_subscription_id, stripe_subscription_item_id
    │
    ├─ [async] provisionInstance():
    │     │
    │     ├─ generateOpenClawConfig() → openclaw.json with Stripe headers
    │     ├─ generateCloudInit() → YAML with Docker setup
    │     ├─ hetzner.createServer() → returns server with IP
    │     ├─ UPDATE instance SET hetzner_server_id, ip_address
    │     ├─ waitForHealth() → poll http://{ip}:3000/health every 10s, max 5min
    │     │     │
    │     │     ├─ [healthy] → UPDATE status='running', provisioned_at=now()
    │     │     └─ [timeout] → UPDATE status='error'
    │     │
    │     └─ INSERT instance_event
    │
    └─ Return { instance } (status: 'provisioning')

Client polls GET /api/instances/[id] every 3s until status != 'provisioning'
    │
    ├─ 'running' → Show success, display IP + details
    └─ 'error'   → Show error, offer retry
```

### 8.2 Billing Cycle Flow

```
Month starts
    │
    ├─ Stripe charges base subscription (€29 for Pro)
    │
    ├─ Throughout the month:
    │     │
    │     ├─ User's OpenClaw instance makes LLM calls
    │     ├─ Each call → Vercel AI Gateway
    │     ├─ Gateway sends stripe-customer-id header
    │     ├─ Vercel emits meter events to Stripe:
    │     │     { event: "token-billing-tokens", customer: "cus_X", value: 1500, token_type: "input" }
    │     │     { event: "token-billing-tokens", customer: "cus_X", value: 300, token_type: "output" }
    │     │
    │     └─ [Optional] Our webhook mirrors events to usage_events table
    │
    ├─ End of month:
    │     │
    │     ├─ Stripe calculates metered usage total
    │     ├─ Applies markup pricing (configured in Stripe dashboard)
    │     ├─ Generates invoice: base + metered
    │     ├─ Charges customer's payment method
    │     │
    │     ├─ Webhook: invoice.paid → log in our DB
    │     └─ Webhook: invoice.payment_failed → flag customer, grace period
    │
    └─ Dashboard shows real-time spend via GET /api/billing/usage
```

### 8.3 Usage Tracking Flow

```
OpenClaw instance → LLM call
    │
    ▼
Vercel AI Gateway (with stripe-customer-id header)
    │
    ├─ Routes to model provider
    ├─ Counts tokens (input + output)
    │
    ├─ Emits Stripe meter event (automatic, non-blocking)
    │     → Stripe adds to customer's metered usage
    │
    └─ [Optional mirror path]:
          Stripe webhook: billing_meter.usage_report
              │
              ▼
          POST /api/webhooks/stripe
              │
              ▼
          INSERT into usage_events {
            instance_id, customer_id, model,
            input_tokens, output_tokens,
            cost_usd, billed_usd
          }
              │
              ▼
          Dashboard queries usage_events for charts
```

**Note on usage data source:** The primary billing source of truth is Stripe (via Vercel meter events). Our `usage_events` table is a mirror for dashboard display purposes. If the mirror lags, billing is still correct — the dashboard just shows slightly stale data.

### 8.4 Instance Lifecycle State Machine

```
                    ┌──────────────┐
         create     │ provisioning │
        ────────►   │              │
                    └──────┬───────┘
                           │
                    health OK / timeout
                     ┌─────┴─────┐
                     ▼           ▼
              ┌──────────┐  ┌───────┐
              │ running  │  │ error │
              │          │  │       │◄──── any failure
              └──┬───┬───┘  └───┬───┘
                 │   │          │
            stop │   │ restart  │ retry (re-provision)
                 ▼   │          │
              ┌──────────┐      │
              │ stopped  │──────┘
              │          │  start
              └──┬───────┘
                 │
              delete
                 ▼
              ┌──────────┐
              │ deleting │
              └──┬───────┘
                 │
                 ▼
              ┌──────────┐
              │ deleted  │  (terminal state, hidden from UI)
              └──────────┘
```

---

## 9. Environment Variables

**File:** `.env.example`

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_RESTRICTED_ACCESS_KEY=rk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_TOKEN_USAGE=price_...
STRIPE_METER_ID=mtr_...

# Hetzner
HETZNER_API_TOKEN=...
HETZNER_SSH_KEY_ID=12345

# Vercel AI Gateway
VERCEL_AI_GATEWAY_KEY=...

# OpenClaw
OPENCLAW_VERSION=latest
```

---

## 10. Dependencies (`package.json`)

```json
{
  "name": "clawcloud",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "stripe:setup": "tsx scripts/sync-stripe-products.ts",
    "seed": "tsx scripts/seed.ts"
  },
  "dependencies": {
    "next": "^15.2",
    "@clerk/nextjs": "^6",
    "stripe": "^17",
    "drizzle-orm": "^0.39",
    "postgres": "^3.4",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-slot": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest",
    "recharts": "^2",
    "sonner": "latest",
    "swr": "^2",
    "zod": "^3",
    "next-themes": "latest",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "latest",
    "drizzle-kit": "^0.30",
    "tsx": "^4",
    "eslint": "^9",
    "eslint-config-next": "^15.2"
  }
}
```

---

## 11. Middleware

**File:** `middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

---

## 12. Build Order (Recommended)

### Week 1: Skeleton + Auth + DB
1. `npx create-next-app@latest` with App Router + Tailwind
2. Install deps, set up shadcn/ui (`npx shadcn@latest init`)
3. Clerk integration: sign-in, sign-up, middleware
4. Supabase: run migrations, set up Drizzle ORM
5. Dashboard layout: sidebar, topbar, routing
6. Clerk webhook → auto-create customer row + Stripe customer

### Week 2: Instances + Hetzner
7. Instance list page (empty state first)
8. Create instance form + POST endpoint
9. Hetzner client + cloud-init generation
10. Provisioning orchestrator (create → poll → running)
11. Instance detail page (overview, status, actions)
12. Start/Stop/Restart actions
13. Delete instance flow
14. Health check endpoint + polling in UI

### Week 3: Stripe Billing
15. Run `stripe:setup` script (products, prices, meter)
16. Subscription creation wired into instance creation
17. Stripe webhook handler (all events)
18. Billing page: current spend, plan card
19. Stripe Customer Portal integration
20. Subscription update (plan change)

### Week 4: Usage Billing + Polish
21. Verify Vercel AI Gateway → Stripe meter flow end-to-end
22. Usage mirror: webhook → usage_events table
23. Usage dashboard: charts, model breakdown
24. Per-instance usage page
25. Instance settings page (config, env vars)
26. Error handling, loading states, edge cases
27. End-to-end testing with real Hetzner + Stripe test mode
