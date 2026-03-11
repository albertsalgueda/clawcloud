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
