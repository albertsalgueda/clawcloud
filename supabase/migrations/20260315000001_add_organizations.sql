-- ============================================================
-- Clean schema: multi-tenant organization support
-- Drops all existing tables and recreates from scratch.
-- ============================================================

-- Drop old trigger + function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop old tables (cascade handles FKs)
DROP TABLE IF EXISTS instance_events CASCADE;
DROP TABLE IF EXISTS usage_events CASCADE;
DROP TABLE IF EXISTS instances CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop old enums (ignore if not exist)
DROP TYPE IF EXISTS org_role CASCADE;
DROP TYPE IF EXISTS instance_status CASCADE;
DROP TYPE IF EXISTS instance_plan CASCADE;
DROP TYPE IF EXISTS instance_region CASCADE;

-- Drop old trigger function
DROP FUNCTION IF EXISTS update_updated_at();

-- ============================================================
-- Helper function
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE instance_status AS ENUM (
  'pending_payment', 'provisioning', 'running', 'stopped', 'error', 'deleting', 'deleted'
);
CREATE TYPE instance_plan AS ENUM ('starter', 'pro', 'business');
CREATE TYPE instance_region AS ENUM ('eu-central', 'eu-west', 'us-east', 'us-west');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');

-- ============================================================
-- Profiles (lightweight user record, no billing)
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_auth ON profiles(auth_user_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Organizations (billing entity, owns instances)
-- ============================================================

CREATE TABLE public.organizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  plan              TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'business')),
  max_instances     INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe ON organizations(stripe_customer_id);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Org members (join table with roles)
-- ============================================================

CREATE TABLE public.org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        org_role NOT NULL DEFAULT 'member',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- ============================================================
-- Instances (owned by org, created_by tracks the user)
-- ============================================================

CREATE TABLE public.instances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by            UUID REFERENCES profiles(id),
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
  gateway_token         TEXT,
  dashboard_url         TEXT,
  config                JSONB NOT NULL DEFAULT '{}'::jsonb,
  env_vars              JSONB NOT NULL DEFAULT '{}'::jsonb,
  provisioned_at        TIMESTAMPTZ,
  last_health_check     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instances_org ON instances(org_id);
CREATE INDEX idx_instances_created_by ON instances(created_by);
CREATE INDEX idx_instances_status ON instances(status);
CREATE INDEX idx_instances_slug ON instances(slug);

CREATE TRIGGER instances_updated_at
  BEFORE UPDATE ON instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Usage events
-- ============================================================

CREATE TABLE public.usage_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  billed_usd    NUMERIC(10, 6) NOT NULL DEFAULT 0,
  stripe_meter_event_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_org ON usage_events(org_id);
CREATE INDEX idx_usage_instance ON usage_events(instance_id);
CREATE INDEX idx_usage_created ON usage_events(created_at);
CREATE INDEX idx_usage_org_period ON usage_events(org_id, created_at);

-- ============================================================
-- Instance events
-- ============================================================

CREATE TABLE public.instance_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL
    CHECK (event_type IN (
      'created', 'provisioning', 'provisioned', 'started', 'stopped',
      'restarted', 'error', 'deleting', 'deleted', 'config_updated',
      'plan_changed', 'subscription_created', 'server_created', 'dns_created'
    )),
  details       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_instance ON instance_events(instance_id);
CREATE INDEX idx_events_type ON instance_events(event_type);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_events ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Organizations
CREATE POLICY orgs_select ON organizations
  FOR SELECT USING (
    id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );
CREATE POLICY orgs_update ON organizations
  FOR UPDATE USING (
    id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid() AND om.role = 'owner')
  );

-- Org members
CREATE POLICY org_members_select ON org_members
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );
CREATE POLICY org_members_insert ON org_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  );
CREATE POLICY org_members_delete ON org_members
  FOR DELETE USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  );

-- Instances
CREATE POLICY instances_select ON instances
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );
CREATE POLICY instances_insert ON instances
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );
CREATE POLICY instances_update ON instances
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
        AND (om.role IN ('owner', 'admin') OR instances.created_by = p.id)
    )
  );
CREATE POLICY instances_delete ON instances
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
        AND (om.role IN ('owner', 'admin') OR instances.created_by = p.id)
    )
  );

-- Usage events
CREATE POLICY usage_select ON usage_events
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );

-- Instance events
CREATE POLICY events_select ON instance_events
  FOR SELECT USING (
    instance_id IN (
      SELECT i.id FROM instances i
      JOIN org_members om ON i.org_id = om.org_id
      JOIN profiles p ON om.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- Auto-create profile + org on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
  new_org_id UUID;
  org_slug TEXT;
  display_name TEXT;
BEGIN
  new_profile_id := gen_random_uuid();
  display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );
  org_slug := REGEXP_REPLACE(LOWER(REPLACE(display_name, ' ', '-')), '[^a-z0-9-]', '', 'g')
    || '-' || SUBSTRING(new_profile_id::text, 1, 8);

  INSERT INTO public.profiles (id, auth_user_id, email, name)
  VALUES (new_profile_id, NEW.id, NEW.email, display_name);

  INSERT INTO public.organizations (name, slug, plan, max_instances)
  VALUES (display_name || '''s Org', org_slug, 'starter', 1)
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, new_profile_id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
