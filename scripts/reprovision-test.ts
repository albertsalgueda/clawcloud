import { generateCloudInit } from '../src/lib/hetzner/cloud-init'
import { generateOpenClawConfig } from '../src/lib/openclaw/config'

const instance = {
  id: '76a4c987-ed87-4d03-94e7-7386b7d3e1b4',
  slug: 'test-r3a3yy',
  name: 'test',
  plan: 'starter',
  region: 'eu-central',
} as any

const org = {
  id: 'b0b6c529-8863-40f9-a588-82bd3ffac766',
  name: 'Demo Org',
  slug: 'demo-org',
  stripe_customer_id: 'cus_U9x1daOWeoX6cJ',
} as any

const gatewayToken = '7612cabe2022e7df684bfb9a565ca7be5354cbab95797d954300793c16f04320'
const domain = process.env.INSTANCE_DOMAIN ?? 'clawcloud.dev'

const openclawConfig = generateOpenClawConfig(instance, org, {
  gatewayToken,
  dashboardUrl: `https://${instance.slug}.${domain}`,
  aiGatewayApiKey: process.env.VERCEL_AI_GATEWAY_KEY ?? '',
  stripeRestrictedKey: process.env.STRIPE_RESTRICTED_ACCESS_KEY ?? '',
})

const userData = generateCloudInit({
  instanceId: instance.id,
  customerId: org.id,
  slug: instance.slug,
  stripeCustomerId: org.stripe_customer_id,
  aiGatewayApiKey: process.env.VERCEL_AI_GATEWAY_KEY ?? '',
  stripeRestrictedKey: process.env.STRIPE_RESTRICTED_ACCESS_KEY ?? '',
  openclawConfig: JSON.stringify(openclawConfig, null, 2),
  openclawVersion: process.env.OPENCLAW_VERSION ?? 'latest',
  gatewayToken,
  domain,
})

async function main() {
  console.log('Creating server with native cloud-init (no Docker, no ClawPort)...')

  const res = await fetch('https://api.hetzner.cloud/v1/servers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `clawcloud-${instance.slug}`,
      server_type: 'cx23',
      location: 'hel1',
      image: 'ubuntu-24.04',
      ssh_keys: [process.env.HETZNER_SSH_KEY_ID!, '109238899'],
      user_data: userData,
      labels: {
        org_id: org.id,
        instance_id: instance.id,
        env: 'development',
        location: 'hel1',
      },
      start_after_create: true,
    }),
  })

  if (!res.ok) {
    const body = await res.json()
    console.error('Failed to create server:', JSON.stringify(body, null, 2))
    process.exit(1)
  }

  const { server } = await res.json()
  console.log(`Server created: id=${server.id}, ip=${server.public_net.ipv4.ip}`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/instances?id=eq.${instance.id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        hetzner_server_id: server.id,
        ip_address: server.public_net.ipv4.ip,
        status: 'provisioning',
      }),
    },
  )

  if (!updateRes.ok) {
    console.error('Failed to update instance:', await updateRes.text())
    process.exit(1)
  }

  console.log(`Instance updated: ip=${server.public_net.ipv4.ip}, status=provisioning`)
  console.log('\nWaiting for cloud-init to complete (checking gateway health every 30s)...')

  const ip = server.public_net.ipv4.ip
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 30_000))
    try {
      const gw = await fetch(`http://${ip}:18789/healthz`, { signal: AbortSignal.timeout(5000) })
      if (gw.ok) {
        console.log(`\nOpenClaw gateway healthy after ${(i + 1) * 30}s!`)

        await fetch(`${supabaseUrl}/rest/v1/instances?id=eq.${instance.id}`, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: 'running', provisioned_at: new Date().toISOString() }),
        })
        console.log('Instance status set to running.')
        return
      }
      console.log(`[${(i + 1) * 30}s] Gateway not ready (status ${gw.status})`)
    } catch {
      console.log(`[${(i + 1) * 30}s] Server unreachable`)
    }
  }

  console.log('\nTimeout: server did not become healthy within 10 minutes.')
  console.log(`SSH in to debug: ssh root@${ip}`)
  process.exit(1)
}

main()
