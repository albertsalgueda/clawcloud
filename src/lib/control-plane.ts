import { createServer } from '@/lib/hetzner/servers'
import { generateCloudInit } from '@/lib/hetzner/cloud-init'
import { generateOpenClawConfig } from '@/lib/openclaw/config'
import { checkInstanceHealth } from '@/lib/openclaw/health'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLANS, REGIONS } from '@/lib/constants'
import type { Instance } from '@/types/instance'
import type { Customer } from '@/lib/auth'

export async function provisionInstance(
  instance: Instance,
  customer: Customer
): Promise<void> {
  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]

  const openclawConfig = generateOpenClawConfig(instance, customer)

  const userData = generateCloudInit({
    instanceId: instance.id,
    customerId: customer.id,
    stripeCustomerId: customer.stripe_customer_id!,
    aiGatewayApiKey: process.env.VERCEL_AI_GATEWAY_KEY!,
    stripeRestrictedKey: process.env.STRIPE_RESTRICTED_ACCESS_KEY!,
    openclawConfig: JSON.stringify(openclawConfig, null, 2),
    openclawVersion: process.env.OPENCLAW_VERSION ?? 'latest',
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
    })
    .eq('id', instance.id)

  const healthy = await waitForHealth(server.public_net.ipv4.ip, {
    maxAttempts: 30,
    intervalMs: 10_000,
  })

  if (healthy) {
    await supabaseAdmin
      .from('instances')
      .update({
        status: 'running',
        provisioned_at: new Date().toISOString(),
      })
      .eq('id', instance.id)

    await logInstanceEvent(instance.id, 'provisioned', {
      server_id: server.id,
      ip: server.public_net.ipv4.ip,
    })
  } else {
    await supabaseAdmin
      .from('instances')
      .update({ status: 'error' })
      .eq('id', instance.id)

    await logInstanceEvent(instance.id, 'error', {
      reason: 'Health check timeout after provisioning',
    })
  }
}

async function waitForHealth(
  ip: string,
  opts: { maxAttempts: number; intervalMs: number }
): Promise<boolean> {
  for (let i = 0; i < opts.maxAttempts; i++) {
    await new Promise(r => setTimeout(r, opts.intervalMs))
    const health = await checkInstanceHealth(ip)
    if (health.status === 'healthy') return true
  }
  return false
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
