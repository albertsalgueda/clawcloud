export type InstanceStatus = 'provisioning' | 'running' | 'stopped' | 'error' | 'deleting' | 'deleted'
export type InstancePlan = 'starter' | 'pro' | 'business'
export type InstanceRegion = 'eu-central' | 'eu-west'

export interface Instance {
  id: string
  org_id: string
  created_by: string | null
  name: string
  slug: string
  status: InstanceStatus
  plan: InstancePlan
  region: InstanceRegion
  hetzner_server_id: number | null
  hetzner_server_type: string | null
  ip_address: string | null
  stripe_subscription_id: string | null
  stripe_subscription_item_id: string | null
  gateway_token: string | null
  dashboard_url: string | null
  config: Record<string, unknown>
  env_vars: Record<string, string>
  provisioned_at: string | null
  last_health_check: string | null
  created_at: string
  updated_at: string
}

export interface CreateInstanceInput {
  name: string
  plan: InstancePlan
  region: InstanceRegion
}
