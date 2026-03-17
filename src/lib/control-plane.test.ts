import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRandomBytes = vi.fn(() => ({
  toString: vi.fn(() => 'gateway-token-123'),
}))
const mockCreateServer = vi.fn()
const mockGenerateCloudInit = vi.fn(() => '#cloud-config')
const mockGenerateOpenClawConfig = vi.fn(() => ({ gateway: { auth: { token: 'gateway-token-123' } } }))
const mockCreateDnsRecord = vi.fn()
const mockIsDnsConfigured = vi.fn()
const mockFrom = vi.fn()

vi.mock('crypto', () => ({
  default: {
    randomBytes: (...args: unknown[]) => mockRandomBytes(...args),
  },
}))

vi.mock('@/lib/hetzner/servers', () => ({
  createServer: (...args: unknown[]) => mockCreateServer(...args),
}))

vi.mock('@/lib/hetzner/cloud-init', () => ({
  generateCloudInit: (...args: unknown[]) => mockGenerateCloudInit(...args),
}))

vi.mock('@/lib/openclaw/config', () => ({
  generateOpenClawConfig: (...args: unknown[]) => mockGenerateOpenClawConfig(...args),
}))

vi.mock('@/lib/dns/cloudflare', () => ({
  createDnsRecord: (...args: unknown[]) => mockCreateDnsRecord(...args),
  isDnsConfigured: (...args: unknown[]) => mockIsDnsConfigured(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function makeInstance() {
  return {
    id: 'inst-1',
    org_id: 'org-1',
    created_by: 'user-1',
    name: 'Demo Instance',
    slug: 'demo',
    status: 'provisioning' as const,
    plan: 'starter' as const,
    region: 'eu-central' as const,
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
    created_at: '2026-03-17T00:00:00Z',
    updated_at: '2026-03-17T00:00:00Z',
  }
}

function makeOrg() {
  return {
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    stripe_customer_id: 'cus_123',
    plan: 'starter',
    max_instances: 10,
    created_at: '2026-03-17T00:00:00Z',
    updated_at: '2026-03-17T00:00:00Z',
  }
}

describe('control plane provisioning', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = {
      ...originalEnv,
      HETZNER_SSH_KEY_ID: 'ssh-key-1',
      NODE_ENV: 'test',
      VERCEL_AI_GATEWAY_KEY: 'vck_123',
      STRIPE_RESTRICTED_ACCESS_KEY: 'rk_123',
      OPENCLAW_VERSION: '2.0.0',
      INSTANCE_DOMAIN: 'agent.example',
    }
  })

  it('provisions a server, updates the instance, and logs DNS plus server events', async () => {
    const updates: Array<Record<string, unknown>> = []
    const inserts: Array<Record<string, unknown>> = []

    mockCreateServer.mockResolvedValue({
      id: 42,
      public_net: {
        ipv4: { ip: '1.2.3.4' },
      },
    })
    mockIsDnsConfigured.mockReturnValue(true)
    mockCreateDnsRecord.mockResolvedValue({ success: true, id: 'dns-123' })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'instances') {
        return {
          update: vi.fn((payload: Record<string, unknown>) => ({
            eq: vi.fn(async () => {
              updates.push(payload)
              return { data: null, error: null }
            }),
          })),
        }
      }
      if (table === 'instance_events') {
        return {
          insert: vi.fn(async (payload: Record<string, unknown>) => {
            inserts.push(payload)
            return { data: null, error: null }
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const { provisionInstance } = await import('./control-plane')

    await provisionInstance(makeInstance(), makeOrg())

    expect(mockGenerateOpenClawConfig).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inst-1', slug: 'demo' }),
      expect.objectContaining({ id: 'org-1' }),
      expect.objectContaining({
        gatewayToken: 'gateway-token-123',
        dashboardUrl: 'https://demo.agent.example',
        aiGatewayApiKey: 'vck_123',
        stripeRestrictedKey: 'rk_123',
      })
    )
    expect(mockGenerateCloudInit).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'demo',
        domain: 'agent.example',
        gatewayToken: 'gateway-token-123',
        openclawVersion: '2.0.0',
      })
    )
    expect(mockCreateServer).toHaveBeenCalledWith({
      name: 'clawcloud-demo',
      serverType: 'cx23',
      location: 'fsn1',
      image: 'ubuntu-24.04',
      sshKeys: ['ssh-key-1'],
      userData: '#cloud-config',
      labels: {
        org_id: 'org-1',
        instance_id: 'inst-1',
        env: 'test',
      },
    })
    expect(updates).toEqual([
      {
        hetzner_server_id: 42,
        hetzner_server_type: 'cx23',
        ip_address: '1.2.3.4',
        gateway_token: 'gateway-token-123',
        dashboard_url: 'https://demo.agent.example',
      },
    ])
    expect(mockCreateDnsRecord).toHaveBeenCalledWith('demo', '1.2.3.4')
    expect(inserts).toEqual([
      {
        instance_id: 'inst-1',
        event_type: 'dns_created',
        details: {
          record_id: 'dns-123',
          hostname: 'demo.agent.example',
        },
      },
      {
        instance_id: 'inst-1',
        event_type: 'server_created',
        details: {
          server_id: 42,
          ip: '1.2.3.4',
          server_type: 'cx23',
          dashboard_url: 'https://demo.agent.example',
        },
      },
    ])
  })

  it('keeps provisioning when DNS creation fails', async () => {
    const inserts: Array<Record<string, unknown>> = []
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mockCreateServer.mockResolvedValue({
      id: 42,
      public_net: {
        ipv4: { ip: '1.2.3.4' },
      },
    })
    mockIsDnsConfigured.mockReturnValue(true)
    mockCreateDnsRecord.mockRejectedValue(new Error('Cloudflare down'))
    mockFrom.mockImplementation((table: string) => {
      if (table === 'instances') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: null, error: null })),
          })),
        }
      }
      if (table === 'instance_events') {
        return {
          insert: vi.fn(async (payload: Record<string, unknown>) => {
            inserts.push(payload)
            return { data: null, error: null }
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const { provisionInstance, logInstanceEvent } = await import('./control-plane')

    await provisionInstance(makeInstance(), makeOrg())
    await logInstanceEvent('inst-2', 'custom_event', { ok: true })

    expect(console.error).toHaveBeenCalledWith(
      'DNS record creation failed:',
      expect.any(Error)
    )
    expect(inserts).toEqual([
      {
        instance_id: 'inst-1',
        event_type: 'server_created',
        details: {
          server_id: 42,
          ip: '1.2.3.4',
          server_type: 'cx23',
          dashboard_url: 'https://demo.agent.example',
        },
      },
      {
        instance_id: 'inst-2',
        event_type: 'custom_event',
        details: { ok: true },
      },
    ])
  })
})
