import { describe, expect, it } from 'vitest'
import { generateCloudInit } from './cloud-init'

describe('generateCloudInit', () => {
  it('builds a cloud-init document with encoded config files and services', () => {
    const params = {
      instanceId: 'inst-1',
      customerId: 'org-1',
      slug: 'demo',
      stripeCustomerId: 'cus_123',
      aiGatewayApiKey: 'vck_123',
      stripeRestrictedKey: 'rk_123',
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
    expect(result).toContain('/etc/caddy/Caddyfile')
    expect(result).toContain('/etc/systemd/system/ttyd.service')
    expect(result).toContain('/etc/systemd/system/openclaw-gateway.service')
    expect(result).toContain('ssh-rsa AAAA')
    expect(result).toContain(
      Buffer.from(
        'AI_GATEWAY_URL=https://gateway.ai.vercel.app/v1\n' +
        'AI_GATEWAY_API_KEY=vck_123\n' +
        'STRIPE_CUSTOMER_ID=cus_123\n' +
        'STRIPE_RESTRICTED_KEY=rk_123\n' +
        'INSTANCE_ID=inst-1\n' +
        'CUSTOMER_ID=org-1\n'
      ).toString('base64')
    )
    expect(result).toContain(
      Buffer.from('demo.example.com {\n').toString('base64').slice(0, 12)
    )
    expect(result).toContain(Buffer.from('{"hello":"world"}').toString('base64'))
    expect(result).toContain('npx playwright install --with-deps chromium')
  })
})
