import type { Organization } from '@/lib/auth'
import type { Instance } from '@/types/instance'

export interface OpenClawConfig {
  gateway: {
    mode: string
    auth: { mode: string; token: string }
    controlUi: {
      allowedOrigins: string[]
      dangerouslyDisableDeviceAuth: boolean
    }
    bind: string
  }
  agents: {
    defaults: {
      model: { primary: string; fallbacks: string[] }
    }
  }
  models: {
    mode: string
    providers: Record<string, {
      baseUrl: string
      apiKey: string
      api: string
      headers: Record<string, string>
      models: Array<{ id: string; name: string }>
    }>
  }
}

const AI_GATEWAY_BASE_URL = 'https://gateway.ai.vercel.app/v1'

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5'

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
  { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4.6' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/o3-mini', name: 'o3-mini' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
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

  return {
    gateway: {
      mode: 'local',
      auth: { mode: 'token', token: params.gatewayToken },
      controlUi: {
        allowedOrigins: ['*'],
        dangerouslyDisableDeviceAuth: true,
      },
      bind: 'lan',
    },
    agents: {
      defaults: {
        model: {
          primary: DEFAULT_MODEL,
          fallbacks: AVAILABLE_MODELS.filter(m => m.id !== DEFAULT_MODEL).map(m => m.id),
        },
      },
    },
    models: {
      mode: 'merge',
      providers: {
        'ai-gateway': {
          baseUrl: AI_GATEWAY_BASE_URL,
          apiKey: params.aiGatewayApiKey,
          api: 'openai-responses',
          headers: billingHeaders,
          models: AVAILABLE_MODELS.map(m => ({ id: m.id, name: m.name })),
        },
      },
    },
  }
}
