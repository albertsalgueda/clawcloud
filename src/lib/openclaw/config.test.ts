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
    credit_balance_eur: '0',
    auto_topup_enabled: true,
    auto_topup_amount_eur: '20',
    auto_topup_threshold_eur: '2',
    credit_limit_eur: null,
    auto_topup_failed: false,
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
    config_version: 2,
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
  proxyBaseUrl: 'https://clawcloud.dev/api/gateway/proxy',
}

describe('generateOpenClawConfig', () => {
  it('generates valid OpenClaw config with correct gateway auth', () => {
    const config = generateOpenClawConfig(makeInstance(), makeOrg(), defaultParams)

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

  it('uses proxy URL instead of direct AI gateway URL', () => {
    const config = generateOpenClawConfig(makeInstance(), makeOrg(), defaultParams)

    const provider = config.models.providers['ai-gateway']
    expect(provider).toBeDefined()
    expect(provider.baseUrl).toBe('https://clawcloud.dev/api/gateway/proxy')
    expect(provider.api).toBe('openai-responses')
    expect(provider.models.length).toBeGreaterThanOrEqual(5)
  })

  it('uses gateway token as API key (no secrets in config)', () => {
    const config = generateOpenClawConfig(makeInstance(), makeOrg(), defaultParams)

    const provider = config.models.providers['ai-gateway']
    expect(provider.apiKey).toBe('gateway-token-xyz')
  })

  it('does not include any billing headers or secrets', () => {
    const config = generateOpenClawConfig(makeInstance(), makeOrg(), defaultParams)

    const provider = config.models.providers['ai-gateway']
    const configStr = JSON.stringify(config)

    // No Stripe keys or billing headers
    expect(configStr).not.toContain('stripe')
    expect(configStr).not.toContain('rk_test')
    expect(configStr).not.toContain('restricted')
    expect((provider as unknown as Record<string, unknown>).headers).toBeUndefined()
  })

  it('works without stripe_customer_id (no longer required)', () => {
    const org = makeOrg({ stripe_customer_id: null })
    expect(() =>
      generateOpenClawConfig(makeInstance(), org, defaultParams)
    ).not.toThrow()
  })
})
