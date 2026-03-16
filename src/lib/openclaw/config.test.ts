import { describe, it, expect } from 'vitest'
import { generateOpenClawConfig } from './config'
import type { Organization } from '@/lib/auth'
import type { Instance } from '@/types/instance'

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    stripe_customer_id: 'cus_test123',
    plan: 'starter',
    max_instances: 50,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeInstance(overrides: Partial<Instance> = {}): Instance {
  return {
    id: 'inst-1',
    org_id: 'org-1',
    created_by: 'user-1',
    name: 'Test Instance',
    slug: 'test-instance',
    status: 'provisioning',
    plan: 'starter',
    region: 'eu-central',
    hetzner_server_id: null,
    hetzner_server_type: null,
    ip_address: null,
    stripe_subscription_id: null,
    stripe_subscription_item_id: null,
    gateway_token: null,
    dashboard_url: null,
    config: {},
    env_vars: {},
    provisioned_at: null,
    last_health_check: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const defaultParams = {
  gatewayToken: 'gateway-token-xyz',
  dashboardUrl: 'https://my-instance.agentcomputers.app',
  aiGatewayApiKey: 'vck_test_key',
  stripeRestrictedKey: 'rk_test_key',
}

describe('generateOpenClawConfig', () => {
  it('throws if org has no stripe_customer_id', () => {
    const org = makeOrg({ stripe_customer_id: null })
    expect(() =>
      generateOpenClawConfig(makeInstance(), org, defaultParams)
    ).toThrow('has no stripe_customer_id')
  })

  it('throws if stripe_customer_id is empty string', () => {
    const org = makeOrg({ stripe_customer_id: '' as unknown as null })
    expect(() =>
      generateOpenClawConfig(makeInstance(), org, defaultParams)
    ).toThrow('has no stripe_customer_id')
  })

  it('generates valid OpenClaw config with correct gateway auth', () => {
    const org = makeOrg({ stripe_customer_id: 'cus_abc123' })
    const config = generateOpenClawConfig(makeInstance(), org, defaultParams)

    expect(config.gateway.auth.mode).toBe('token')
    expect(config.gateway.auth.token).toBe('gateway-token-xyz')
    expect(config.gateway.bind).toBe('lan')
    expect(config.gateway.controlUi.allowedOrigins).toEqual(['https://my-instance.agentcomputers.app'])
  })

  it('sets default model with primary and fallbacks', () => {
    const config = generateOpenClawConfig(makeInstance(), makeOrg(), defaultParams)
    expect(config.agents.defaults.model.primary).toBe('anthropic/claude-sonnet-4-5')
    expect(config.agents.defaults.model.fallbacks.length).toBeGreaterThan(0)
    expect(config.agents.defaults.model.fallbacks).not.toContain(config.agents.defaults.model.primary)
  })

  it('configures AI Gateway provider with billing headers', () => {
    const org = makeOrg({ stripe_customer_id: 'cus_abc123' })
    const config = generateOpenClawConfig(makeInstance(), org, defaultParams)

    expect(config.models.mode).toBe('merge')
    const provider = config.models.providers['ai-gateway']
    expect(provider).toBeDefined()
    expect(provider.baseUrl).toBe('https://gateway.ai.vercel.app/v1')
    expect(provider.apiKey).toBe('vck_test_key')
    expect(provider.api).toBe('openai-responses')
    expect(provider.headers['stripe-customer-id']).toBe('cus_abc123')
    expect(provider.headers['stripe-restricted-access-key']).toBe('rk_test_key')
    expect(provider.models.length).toBeGreaterThanOrEqual(5)
    expect(provider.models.map(m => m.id)).toContain('openai/gpt-4o')
  })
})
