import { describe, expect, it } from 'vitest'
import { generateCloudInit } from './cloud-init'

describe('generateCloudInit', () => {
  it('builds a cloud-init with openclaw env and config', () => {
    const params = {
      instanceId: 'inst-1',
      customerId: 'org-1',
      slug: 'demo',
      proxyBaseUrl: 'https://app.example/api/gateway/proxy',
      openclawConfig: '{"hello":"world"}',
      openclawVersion: '1.2.3',
      gatewayToken: 'gw-token-123',
      domain: 'example.com',
      sshPublicKey: 'ssh-rsa AAAA',
    }

    const result = generateCloudInit(params)

    expect(result).toContain('#cloud-config')
    expect(result).toContain('/home/openclaw/.openclaw/.env')
    expect(result).toContain('/home/openclaw/.openclaw/openclaw.json')
    expect(result).toContain('ssh-rsa AAAA')
    expect(result).toContain('openclaw-gateway.service')
    expect(result).toContain('base64 -d > /etc/caddy/Caddyfile')

    const openclawEnvB64 = Buffer.from('AI_GATEWAY_API_KEY=gw-token-123\n').toString('base64')
    expect(result).toContain(openclawEnvB64)
  })
})
