import crypto from 'crypto'
import { createServer } from '@/lib/hetzner/servers'
import { generateCloudInit } from '@/lib/hetzner/cloud-init'
import { generateOpenClawConfig } from '@/lib/openclaw/config'
import { createDnsRecord, isDnsConfigured } from '@/lib/dns/cloudflare'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS, REGIONS } from '@/lib/constants'
import type { Instance } from '@/types/instance'
import type { Organization } from '@/lib/auth'

const INSTANCE_DOMAIN = process.env.INSTANCE_DOMAIN ?? 'agentcomputers.app'

export async function provisionInstance(
  instance: Instance,
  org: Organization
): Promise<void> {
  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]
  const gatewayToken = crypto.randomBytes(32).toString('hex')
  const dashboardUrl = `https://${instance.slug}.${INSTANCE_DOMAIN}`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agentcomputers.app'
  const proxyBaseUrl = `${appUrl}/api/gateway/proxy`

  const openclawConfig = generateOpenClawConfig(instance, org, {
    gatewayToken,
    dashboardUrl,
    proxyBaseUrl,
  })

  const userData = generateCloudInit({
    instanceId: instance.id,
    customerId: org.id,
    slug: instance.slug,
    proxyBaseUrl,
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
      org_id: org.id,
      instance_id: instance.id,
      env: process.env.NODE_ENV ?? 'production',
    },
  })

  let dnsSuccess = false
  if (isDnsConfigured()) {
    try {
      const dns = await createDnsRecord(instance.slug, server.public_net.ipv4.ip)
      dnsSuccess = dns.success
      if (dns.success) {
        await logInstanceEvent(instance.id, 'dns_created', {
          record_id: dns.id,
          hostname: `${instance.slug}.${INSTANCE_DOMAIN}`,
        })
      } else {
        console.error('DNS record creation returned failure for', instance.slug)
      }
    } catch (err) {
      console.error('DNS record creation failed:', err)
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('instances')
    .update({
      hetzner_server_id: server.id,
      hetzner_server_type: plan.hetzner_type,
      ip_address: server.public_net.ipv4.ip,
      gateway_token: gatewayToken,
      dashboard_url: dnsSuccess ? dashboardUrl : null,
    })
    .eq('id', instance.id)

  if (updateError) {
    console.error('Failed to update instance after server creation:', updateError)
    throw new Error(`Instance DB update failed: ${updateError.message}`)
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
