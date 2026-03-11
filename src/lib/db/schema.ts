import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  numeric,
  bigint,
  inet,
  pgEnum,
  index,
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

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  auth_user_id: uuid('auth_user_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  stripe_customer_id: text('stripe_customer_id').unique(),
  plan: text('plan').notNull().default('starter'),
  max_instances: integer('max_instances').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const instances = pgTable('instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
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
  config: jsonb('config').notNull().default({}),
  env_vars: jsonb('env_vars').notNull().default({}),
  provisioned_at: timestamp('provisioned_at', { withTimezone: true }),
  last_health_check: timestamp('last_health_check', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_instances_customer').on(table.customer_id),
  index('idx_instances_status').on(table.status),
  index('idx_instances_slug').on(table.slug),
])

export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  instance_id: uuid('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  model: text('model').notNull(),
  input_tokens: integer('input_tokens').notNull().default(0),
  output_tokens: integer('output_tokens').notNull().default(0),
  cost_usd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  billed_usd: numeric('billed_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  stripe_meter_event_id: text('stripe_meter_event_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_usage_customer').on(table.customer_id),
  index('idx_usage_instance').on(table.instance_id),
  index('idx_usage_created').on(table.created_at),
  index('idx_usage_customer_period').on(table.customer_id, table.created_at),
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

export const customersRelations = relations(customers, ({ many }) => ({
  instances: many(instances),
  usageEvents: many(usageEvents),
}))

export const instancesRelations = relations(instances, ({ one, many }) => ({
  customer: one(customers, {
    fields: [instances.customer_id],
    references: [customers.id],
  }),
  events: many(instanceEvents),
  usageEvents: many(usageEvents),
}))

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  instance: one(instances, {
    fields: [usageEvents.instance_id],
    references: [instances.id],
  }),
  customer: one(customers, {
    fields: [usageEvents.customer_id],
    references: [customers.id],
  }),
}))

export const instanceEventsRelations = relations(instanceEvents, ({ one }) => ({
  instance: one(instances, {
    fields: [instanceEvents.instance_id],
    references: [instances.id],
  }),
}))
