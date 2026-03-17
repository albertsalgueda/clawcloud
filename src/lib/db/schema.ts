import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  bigint,
  inet,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const instanceStatusEnum = pgEnum('instance_status', [
  'provisioning', 'running', 'stopped', 'error', 'deleting', 'deleted',
])

export const instancePlanEnum = pgEnum('instance_plan', [
  'starter', 'pro', 'business',
])

export const instanceRegionEnum = pgEnum('instance_region', [
  'eu-central', 'eu-west', 'us-east', 'us-west',
])

export const orgRoleEnum = pgEnum('org_role', [
  'owner', 'admin', 'member',
])

export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'topup', 'usage', 'refund', 'manual_adjustment',
])

// Profiles (renamed from customers) — lightweight user record
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  auth_user_id: uuid('auth_user_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_profiles_auth').on(table.auth_user_id),
])

// Organizations — billing entity, owns instances
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  stripe_customer_id: text('stripe_customer_id').unique(),
  plan: text('plan').notNull().default('starter'),
  max_instances: integer('max_instances').notNull().default(1),
  credit_balance_eur: numeric('credit_balance_eur', { precision: 10, scale: 6 }).notNull().default('0'),
  auto_topup_enabled: boolean('auto_topup_enabled').notNull().default(true),
  auto_topup_amount_eur: numeric('auto_topup_amount_eur', { precision: 10, scale: 2 }).notNull().default('20'),
  auto_topup_threshold_eur: numeric('auto_topup_threshold_eur', { precision: 10, scale: 2 }).notNull().default('2'),
  credit_limit_eur: numeric('credit_limit_eur', { precision: 10, scale: 2 }),
  auto_topup_failed: boolean('auto_topup_failed').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_organizations_slug').on(table.slug),
  index('idx_organizations_stripe').on(table.stripe_customer_id),
])

// Org members — join table with roles
export const orgMembers = pgTable('org_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: orgRoleEnum('role').notNull().default('member'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_org_members_org_user').on(table.org_id, table.user_id),
  index('idx_org_members_org').on(table.org_id),
  index('idx_org_members_user').on(table.user_id),
])

export const instances = pgTable('instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  created_by: uuid('created_by').references(() => profiles.id),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  status: instanceStatusEnum('status').notNull().default('provisioning'),
  plan: instancePlanEnum('plan').notNull().default('starter'),
  region: instanceRegionEnum('region').notNull().default('eu-central'),
  hetzner_server_id: bigint('hetzner_server_id', { mode: 'number' }),
  hetzner_server_type: text('hetzner_server_type'),
  ip_address: inet('ip_address'),
  stripe_subscription_id: text('stripe_subscription_id'),
  stripe_subscription_item_id: text('stripe_subscription_item_id'),
  gateway_token: text('gateway_token'),
  dashboard_url: text('dashboard_url'),
  config: jsonb('config').notNull().default({}),
  env_vars: jsonb('env_vars').notNull().default({}),
  config_version: integer('config_version').notNull().default(1),
  provisioned_at: timestamp('provisioned_at', { withTimezone: true }),
  last_health_check: timestamp('last_health_check', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_instances_org').on(table.org_id),
  index('idx_instances_created_by').on(table.created_by),
  index('idx_instances_status').on(table.status),
  index('idx_instances_slug').on(table.slug),
])

// Credit transactions — tracks every balance change (topup, usage deduction, refund)
export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  instance_id: uuid('instance_id').references(() => instances.id, { onDelete: 'cascade' }),
  type: creditTransactionTypeEnum('type').notNull(),
  amount_eur: numeric('amount_eur', { precision: 10, scale: 6 }).notNull(),
  balance_after_eur: numeric('balance_after_eur', { precision: 10, scale: 6 }).notNull(),
  model: text('model'),
  input_tokens: integer('input_tokens'),
  output_tokens: integer('output_tokens'),
  stripe_payment_intent_id: text('stripe_payment_intent_id'),
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_credit_txn_org_period').on(table.org_id, table.created_at),
  index('idx_credit_txn_instance').on(table.instance_id),
  index('idx_credit_txn_stripe_pi').on(table.stripe_payment_intent_id),
])

export const instanceEvents = pgTable('instance_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  instance_id: uuid('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),
  event_type: text('event_type').notNull(),
  details: jsonb('details').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_events_instance').on(table.instance_id),
  index('idx_events_type').on(table.event_type),
])

// Relations

export const profilesRelations = relations(profiles, ({ many }) => ({
  memberships: many(orgMembers),
}))

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  instances: many(instances),
  creditTransactions: many(creditTransactions),
}))

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.org_id],
    references: [organizations.id],
  }),
  user: one(profiles, {
    fields: [orgMembers.user_id],
    references: [profiles.id],
  }),
}))

export const instancesRelations = relations(instances, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [instances.org_id],
    references: [organizations.id],
  }),
  creator: one(profiles, {
    fields: [instances.created_by],
    references: [profiles.id],
  }),
  events: many(instanceEvents),
  creditTransactions: many(creditTransactions),
}))

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [creditTransactions.org_id],
    references: [organizations.id],
  }),
  instance: one(instances, {
    fields: [creditTransactions.instance_id],
    references: [instances.id],
  }),
}))

export const instanceEventsRelations = relations(instanceEvents, ({ one }) => ({
  instance: one(instances, {
    fields: [instanceEvents.instance_id],
    references: [instances.id],
  }),
}))
