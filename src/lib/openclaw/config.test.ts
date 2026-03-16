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

describe('generateOpenClawConfig', () => {
  it('throws if org has no stripe_customer_id', () => {
    const org = makeOrg({ stripe_customer_id: null })
    expect(() =>
      generateOpenClawConfig(makeInstance(), org, 'token123', 'https://test.example.com')
    ).toThrow('has no stripe_customer_id')
  })

  it('throws if stripe_customer_id is empty string', () => {
    const org = makeOrg({ stripe_customer_id: '' as unknown as null })
    expect(() =>
      generateOpenClawConfig(makeInstance(), org, 'token123', 'https://test.example.com')
    ).toThrow('has no stripe_customer_id')
  })

  it('generates valid OpenClaw config with correct gateway auth', () => {
    const org = makeOrg({ stripe_customer_id: 'cus_abc123' })
    const config = generateOpenClawConfig(
      makeInstance(),
      org,
      'gateway-token-xyz',
      'https://my-instance.agentcomputers.app'
    )

    expect(config.gateway.auth.mode).toBe('token')
    expect(config.gateway.auth.token).toBe('gateway-token-xyz')
    expect(config.gateway.bind).toBe('lan')
    expect(config.gateway.controlUi.allowedOrigins).toEqual(['https://my-instance.agentcomputers.app'])
  })

  it('sets default model as object with primary key', () => {
    const config = generateOpenClawConfig(
      makeInstance(),
      makeOrg(),
      'token',
      'https://test.example.com'
    )

    expect(config.agents.defaults.model).toEqual({ primary: 'anthropic/claude-sonnet-4.6' })
  })

  it('configures all models with AI Gateway baseUrl and billing headers', () => {
    const org = makeOrg({ stripe_customer_id: 'cus_abc123' })
    const config = generateOpenClawConfig(
      makeInstance(),
      org,
      'token',
      'https://test.example.com'
    )

    const modelKeys = Object.keys(config.models)
    expect(modelKeys).toContain('anthropic/claude-sonnet-4.6')
    expect(modelKeys).toContain('openai/gpt-4o')
    expect(modelKeys).toContain('google/gemini-2.5-pro')
    expect(modelKeys.length).toBeGreaterThanOrEqual(5)

    for (const model of Object.values(config.models)) {
      expect(model.baseUrl).toBe('https://gateway.ai.vercel.app/v1')
      expect(model.apiKey).toBe('${AI_GATEWAY_API_KEY}')
      expect(model.headers['stripe-customer-id']).toBe('cus_abc123')
      expect(model.headers['stripe-restricted-access-key']).toBe('${STRIPE_RESTRICTED_KEY}')
    }
  })
})
