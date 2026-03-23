-- Add config_version column that was in Drizzle schema but missing from DB
ALTER TABLE public.instances
  ADD COLUMN IF NOT EXISTS config_version INTEGER NOT NULL DEFAULT 1;

-- Expand instance_events CHECK to include event types used at runtime
ALTER TABLE public.instance_events DROP CONSTRAINT IF EXISTS instance_events_event_type_check;
ALTER TABLE public.instance_events
  ADD CONSTRAINT instance_events_event_type_check CHECK (event_type IN (
    'created', 'provisioning', 'provisioned', 'started', 'stopped',
    'restarted', 'error', 'deleting', 'deleted', 'config_updated',
    'plan_changed', 'subscription_created', 'server_created', 'dns_created',
    'payment_completed'
  ));
