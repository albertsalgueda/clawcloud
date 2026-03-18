import { describe, expect, it } from 'vitest'
import { generateCloudInit } from './cloud-init'

describe('generateCloudInit', () => {
  it('builds a cloud-init document with encoded config files and services', () => {
    const params = {
      instanceId: 'inst-1',
      customerId: 'org-1',
      slug: 'demo',
      proxyBaseUrl: 'https://app.example/api/gateway/proxy',
      openclawConfig: '{"hello":"world"}',
      openclawVersion: '1.2.3',
      gatewayToken: 'gateway-token',
      domain: 'example.com',
      sshPublicKey: 'ssh-rsa AAAA',
    }

    const result = generateCloudInit(params)

    expect(result).toContain('#cloud-config')
    expect(result).toContain('/home/openclaw/.env')
    expect(result).toContain('/home/openclaw/.openclaw/openclaw.json')
    expect(result).toContain('/etc/systemd/system/ttyd.service')
    expect(result).toContain('/etc/systemd/system/openclaw-gateway.service')
    expect(result).toContain('ssh-rsa AAAA')
    expect(result).toContain(
      Buffer.from(
        'AI_GATEWAY_URL=https://app.example/api/gateway/proxy\n' +
        'INSTANCE_ID=inst-1\n' +
        'CUSTOMER_ID=org-1\n'
      ).toString('base64')
    )
    expect(result).toContain(Buffer.from('{"hello":"world"}').toString('base64'))
    expect(result).toContain('npx playwright install --with-deps chromium')
    expect(result).toContain('base64 -d > /etc/caddy/Caddyfile')
    expect(result).toContain('openclaw-gateway.service')
  })
})
