-- ============================================================
-- Multi-tenant organization support migration
-- ============================================================

-- 1. Create org_role enum
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');

-- 2. Create organizations table
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

-- 3. Rename customers -> profiles and drop billing columns
ALTER TABLE customers RENAME TO profiles;

ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS plan;
ALTER TABLE profiles DROP COLUMN IF EXISTS max_instances;

-- Rename indexes
ALTER INDEX IF EXISTS idx_customers_auth RENAME TO idx_profiles_auth;
ALTER INDEX IF EXISTS idx_customers_stripe RENAME TO idx_profiles_stripe_old;

-- 4. Create org_members join table
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

-- 5. Migrate existing data: create a personal org for each profile
INSERT INTO organizations (id, name, slug, stripe_customer_id, plan, max_instances, created_at, updated_at)
SELECT
  p.id,
  COALESCE(NULLIF(p.name, ''), split_part(p.email, '@', 1)) || '''s Org',
  LOWER(REPLACE(REPLACE(p.id::text, '-', ''), ' ', '-')),
  NULL,
  'starter',
  1,
  p.created_at,
  p.updated_at
FROM profiles p;

-- We need to get stripe_customer_id from the old data. Since we already dropped it,
-- we'll handle this via the instances migration below. For existing stripe data,
-- we use a temp approach: read from instances that have subscriptions.

-- Create owner memberships for each profile -> their personal org
INSERT INTO org_members (org_id, user_id, role)
SELECT p.id, p.id, 'owner'
FROM profiles p;

-- 6. Add org_id and created_by to instances, migrate data
ALTER TABLE instances ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE instances ADD COLUMN created_by UUID REFERENCES profiles(id);

UPDATE instances SET org_id = customer_id, created_by = customer_id;

ALTER TABLE instances ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE instances DROP COLUMN customer_id;

CREATE INDEX idx_instances_org ON instances(org_id);
CREATE INDEX idx_instances_created_by ON instances(created_by);

-- 7. Add org_id to usage_events, migrate data
ALTER TABLE usage_events ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE usage_events SET org_id = customer_id;

ALTER TABLE usage_events ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE usage_events DROP COLUMN customer_id;

CREATE INDEX idx_usage_org ON usage_events(org_id);
CREATE INDEX idx_usage_org_period ON usage_events(org_id, created_at);

-- 8. Drop old RLS policies
DROP POLICY IF EXISTS customers_select ON profiles;
DROP POLICY IF EXISTS customers_update ON profiles;
DROP POLICY IF EXISTS instances_select ON instances;
DROP POLICY IF EXISTS instances_insert ON instances;
DROP POLICY IF EXISTS instances_update ON instances;
DROP POLICY IF EXISTS instances_delete ON instances;
DROP POLICY IF EXISTS usage_select ON usage_events;
DROP POLICY IF EXISTS events_select ON instance_events;

-- 9. Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- 10. New RLS policies

-- Profiles: users can read/update their own profile
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Organizations: members can read their orgs
CREATE POLICY orgs_select ON organizations
  FOR SELECT USING (
    id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );

-- Organizations: owners can update
CREATE POLICY orgs_update ON organizations
  FOR UPDATE USING (
    id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid() AND om.role = 'owner')
  );

-- Org members: members can see their org's members
CREATE POLICY org_members_select ON org_members
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );

-- Org members: admins+ can insert members
CREATE POLICY org_members_insert ON org_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  );

-- Org members: admins+ can delete members
CREATE POLICY org_members_delete ON org_members
  FOR DELETE USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  );

-- Instances: org members can read instances in their orgs
CREATE POLICY instances_select ON instances
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );

-- Instances: org members can create instances
CREATE POLICY instances_insert ON instances
  FOR INSERT WITH CHECK (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );

-- Instances: admins+ can update any, members can update own
CREATE POLICY instances_update ON instances
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
        AND (om.role IN ('owner', 'admin') OR instances.created_by = p.id)
    )
  );

-- Instances: admins+ can delete any, members can delete own
CREATE POLICY instances_delete ON instances
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
        AND (om.role IN ('owner', 'admin') OR instances.created_by = p.id)
    )
  );

-- Usage events: org members can read
CREATE POLICY usage_select ON usage_events
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om JOIN profiles p ON om.user_id = p.id WHERE p.auth_user_id = auth.uid())
  );

-- Instance events: org members can read events for their org's instances
CREATE POLICY events_select ON instance_events
  FOR SELECT USING (
    instance_id IN (
      SELECT i.id FROM instances i
      JOIN org_members om ON i.org_id = om.org_id
      JOIN profiles p ON om.user_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- 11. Update handle_new_user trigger to create profile + default org + membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_id UUID;
  org_slug TEXT;
  display_name TEXT;
BEGIN
  profile_id := gen_random_uuid();
  display_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1));
  org_slug := LOWER(REGEXP_REPLACE(REPLACE(display_name, ' ', '-'), '[^a-z0-9-]', '', 'g')) || '-' || SUBSTRING(profile_id::text, 1, 8);

  INSERT INTO public.profiles (id, auth_user_id, email, name)
  VALUES (profile_id, NEW.id, NEW.email, display_name);

  INSERT INTO public.organizations (name, slug, plan, max_instances)
  VALUES (display_name || '''s Org', org_slug, 'starter', 1)
  RETURNING id INTO profile_id;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (profile_id, (SELECT id FROM profiles WHERE auth_user_id = NEW.id), 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists, just replaced the function
