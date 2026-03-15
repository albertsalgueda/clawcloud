import crypto from 'crypto'
import { createServer } from '@/lib/hetzner/servers'
import { generateCloudInit } from '@/lib/hetzner/cloud-init'
import { generateOpenClawConfig } from '@/lib/openclaw/config'
import { createDnsRecord, isDnsConfigured } from '@/lib/dns/cloudflare'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS, REGIONS } from '@/lib/constants'
import type { Instance } from '@/types/instance'
import type { Customer } from '@/lib/auth'

const INSTANCE_DOMAIN = process.env.INSTANCE_DOMAIN ?? 'clawcloud.dev'

export async function provisionInstance(
  instance: Instance,
  customer: Customer
): Promise<void> {
  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]
  const gatewayToken = crypto.randomBytes(32).toString('hex')
  const dashboardUrl = `https://${instance.slug}.${INSTANCE_DOMAIN}`

  const openclawConfig = generateOpenClawConfig(instance, customer, gatewayToken, dashboardUrl)

  const userData = generateCloudInit({
    instanceId: instance.id,
    customerId: customer.id,
    slug: instance.slug,
    stripeCustomerId: customer.stripe_customer_id ?? '',
    aiGatewayApiKey: process.env.VERCEL_AI_GATEWAY_KEY ?? '',
    stripeRestrictedKey: process.env.STRIPE_RESTRICTED_ACCESS_KEY ?? '',
    openclawConfig: JSON.stringify(openclawConfig, null, 2),
    openclawVersion: process.env.OPENCLAW_VERSION ?? 'latest',
    gatewayToken,
    domain: INSTANCE_DOMAIN,
  })

  const server = await createServer({
    name: `clawcloud-${instance.slug}`,
    serverType: plan.hetzner_type,
    location: region.hetzner,
    image: 'ubuntu-24.04',
    sshKeys: [process.env.HETZNER_SSH_KEY_ID!],
    userData,
    labels: {
      customer_id: customer.id,
      instance_id: instance.id,
      env: process.env.NODE_ENV ?? 'production',
    },
  })

  await supabaseAdmin
    .from('instances')
    .update({
      hetzner_server_id: server.id,
      hetzner_server_type: plan.hetzner_type,
      ip_address: server.public_net.ipv4.ip,
      gateway_token: gatewayToken,
      dashboard_url: dashboardUrl,
    })
    .eq('id', instance.id)

  if (isDnsConfigured()) {
    try {
      const dns = await createDnsRecord(instance.slug, server.public_net.ipv4.ip)
      if (dns.success) {
        await logInstanceEvent(instance.id, 'dns_created', {
          record_id: dns.id,
          hostname: `${instance.slug}.${INSTANCE_DOMAIN}`,
        })
      }
    } catch (err) {
      console.error('DNS record creation failed:', err)
    }
  }

  await logInstanceEvent(instance.id, 'server_created', {
    server_id: server.id,
    ip: server.public_net.ipv4.ip,
    server_type: plan.hetzner_type,
    dashboard_url: dashboardUrl,
  })
}

export async function logInstanceEvent(
  instanceId: string,
  eventType: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await supabaseAdmin.from('instance_events').insert({
    instance_id: instanceId,
    event_type: eventType,
    details,
  })
}
