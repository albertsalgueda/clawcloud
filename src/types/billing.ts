export interface UsageSummary {
  period: { start: string; end: string }
  base_cost: number
  token_cost: number
  total_cost: number
  by_model: UsageByModel[]
  by_instance: InstanceUsage[]
  daily: DailyUsage[]
}

export interface UsageByModel {
  model: string
  input_tokens: number
  output_tokens: number
  cost: number
}

export interface DailyUsage {
  date: string
  cost: number
  input_tokens: number
  output_tokens: number
  requests: number
}

export interface InstanceUsage {
  instance_id: string | null
  instance_name: string
  cost: number
  input_tokens: number
  output_tokens: number
  requests: number
}

export interface PlanInfo {
  key: string
  name: string
  price_eur: number
  vcpu: number
  ram_gb: number
  max_instances: number
}
