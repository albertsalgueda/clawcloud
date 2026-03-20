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
 * Uses the built-in vercel-ai-gateway provider. The API key and base URL
 * are set via environment variables (AI_GATEWAY_API_KEY, AI_GATEWAY_BASE_URL)
 * in ~/.openclaw/.env, not in this config file. OpenClaw auto-discovers
 * all available models from the gateway.
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
  }
}
