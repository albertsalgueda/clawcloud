import type { Customer } from '@/lib/auth'
import type { Instance } from '@/types/instance'

interface OpenClawConfig {
  gateway: {
    auth: { token: string }
    controlUi: { allowedOrigins: string[] }
  }
  models: {
    providers: Record<string, {
      apiKey: string
      baseUrl: string
      headers: Record<string, string>
    }>
    default: string
    available: string[]
  }
}

export function generateOpenClawConfig(
  _instance: Instance,
  customer: Customer,
  gatewayToken: string,
  dashboardUrl: string,
): OpenClawConfig {
  return {
    gateway: {
      auth: { token: gatewayToken },
      controlUi: {
        allowedOrigins: [dashboardUrl],
      },
    },
    models: {
      providers: {
        'vercel-ai-gateway': {
          apiKey: '${AI_GATEWAY_API_KEY}',
          baseUrl: 'https://gateway.ai.vercel.app/v1',
          headers: {
            'stripe-customer-id': customer.stripe_customer_id ?? '',
            'stripe-restricted-access-key': '${STRIPE_RESTRICTED_KEY}',
          },
        },
      },
      default: 'vercel-ai-gateway/anthropic/claude-sonnet-4.6',
      available: [
        'vercel-ai-gateway/anthropic/claude-sonnet-4.6',
        'vercel-ai-gateway/anthropic/claude-opus-4.6',
        'vercel-ai-gateway/openai/gpt-4o',
        'vercel-ai-gateway/openai/o3-mini',
        'vercel-ai-gateway/google/gemini-2.5-pro',
      ],
    },
  }
}
