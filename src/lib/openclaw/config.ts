import type { Organization } from '@/lib/auth'
import type { Instance } from '@/types/instance'

export interface OpenClawConfig {
  gateway: {
    auth: { mode: string; token: string }
    controlUi: { allowedOrigins: string[] }
    bind: string
  }
  agents: {
    defaults: {
      model: { primary: string }
    }
  }
  models: Record<string, {
    provider: string
    apiKey: string
    baseUrl: string
    headers: Record<string, string>
  }>
}

const AI_GATEWAY_BASE_URL = 'https://gateway.ai.vercel.app/v1'

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6'

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4.6', provider: 'anthropic' },
  { id: 'anthropic/claude-opus-4.6', provider: 'anthropic' },
  { id: 'openai/gpt-4o', provider: 'openai' },
  { id: 'openai/o3-mini', provider: 'openai' },
  { id: 'google/gemini-2.5-pro', provider: 'google' },
]

interface ConfigParams {
  gatewayToken: string
  dashboardUrl: string
  aiGatewayApiKey: string
  stripeRestrictedKey: string
}

export function generateOpenClawConfig(
  _instance: Instance,
  org: Organization,
  params: ConfigParams,
): OpenClawConfig {
  if (!org.stripe_customer_id) {
    throw new Error(
      `Cannot generate OpenClaw config: org ${org.id} has no stripe_customer_id. ` +
      'AI usage would be unmetered and unbilled.'
    )
  }

  const billingHeaders = {
    'stripe-customer-id': org.stripe_customer_id,
    'stripe-restricted-access-key': params.stripeRestrictedKey,
  }

  const models: OpenClawConfig['models'] = {}
  for (const model of AVAILABLE_MODELS) {
    models[model.id] = {
      provider: model.provider,
      apiKey: params.aiGatewayApiKey,
      baseUrl: AI_GATEWAY_BASE_URL,
      headers: billingHeaders,
    }
  }

  return {
    gateway: {
      auth: { mode: 'token', token: params.gatewayToken },
      controlUi: {
        allowedOrigins: [params.dashboardUrl],
      },
      bind: 'lan',
    },
    agents: {
      defaults: {
        model: { primary: DEFAULT_MODEL },
      },
    },
    models,
  }
}
