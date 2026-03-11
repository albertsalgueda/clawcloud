ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_events ENABLE ROW LEVEL SECURITY;

-- Customers: users can only read/update their own row
CREATE POLICY customers_select ON customers
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY customers_update ON customers
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Instances: users can only access their own instances
CREATE POLICY instances_select ON instances
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY instances_insert ON instances
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY instances_update ON instances
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY instances_delete ON instances
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- Usage events: read-only for own data
CREATE POLICY usage_select ON usage_events
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- Instance events: read-only for own instances
CREATE POLICY events_select ON instance_events
  FOR SELECT USING (
    instance_id IN (
      SELECT i.id FROM instances i
      JOIN customers c ON i.customer_id = c.id
      WHERE c.auth_user_id = auth.uid()
    )
  );
