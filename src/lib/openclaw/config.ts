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
      model: { primary: string }
    }
  }
  models: {
    providers: Record<string, { baseUrl: string; models: never[] }>
  }
}

const DEFAULT_MODEL = 'vercel-ai-gateway/anthropic/claude-sonnet-4.5'

interface ConfigParams {
  gatewayToken: string
  dashboardUrl: string
  proxyBaseUrl: string
}

/**
 * Generate the OpenClaw configuration for a VPS instance.
 *
 * Uses the built-in vercel-ai-gateway provider for model discovery and catalog.
 * Overrides its baseUrl to route LLM requests through our metering proxy.
 * AI_GATEWAY_API_KEY is set in ~/.openclaw/.env (not in this config).
 *
 * The built-in provider uses api: "anthropic-messages", so pi-ai appends
 * /v1/messages to the baseUrl. The proxy baseUrl must NOT end with /v1.
 */
export function generateOpenClawConfig(
  _instance: Instance,
  _org: Organization,
  params: ConfigParams,
): OpenClawConfig {
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
        },
      },
    },
    models: {
      providers: {
        'vercel-ai-gateway': {
          baseUrl: params.proxyBaseUrl,
          models: [],
        },
      },
    },
  }
}
