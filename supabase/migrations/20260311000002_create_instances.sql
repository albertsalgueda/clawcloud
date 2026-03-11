CREATE TYPE instance_status AS ENUM (
  'provisioning', 'running', 'stopped', 'error', 'deleting', 'deleted'
);

CREATE TYPE instance_plan AS ENUM ('starter', 'pro', 'business');

CREATE TYPE instance_region AS ENUM (
  'eu-central',
  'eu-west',
  'us-east',
  'us-west'
);

CREATE TABLE public.instances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  status                instance_status NOT NULL DEFAULT 'provisioning',
  plan                  instance_plan NOT NULL DEFAULT 'starter',
  region                instance_region NOT NULL DEFAULT 'eu-central',
  hetzner_server_id     BIGINT,
  hetzner_server_type   TEXT,
  ip_address            INET,
  stripe_subscription_id      TEXT,
  stripe_subscription_item_id TEXT,
  config                JSONB NOT NULL DEFAULT '{}'::jsonb,
  env_vars              JSONB NOT NULL DEFAULT '{}'::jsonb,
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
