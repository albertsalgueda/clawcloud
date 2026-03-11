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
