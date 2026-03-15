const CF_API = 'https://api.cloudflare.com/client/v4'

function getConfig() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  if (!apiToken || !zoneId) return null
  return { apiToken, zoneId }
}

export async function createDnsRecord(
  subdomain: string,
  ip: string,
): Promise<{ success: boolean; id?: string }> {
  const config = getConfig()
  if (!config) return { success: false }

  const domain = process.env.INSTANCE_DOMAIN ?? 'clawcloud.dev'
  const name = `${subdomain}.${domain}`

  const res = await fetch(`${CF_API}/zones/${config.zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'A',
      name,
      content: ip,
      ttl: 60,
      proxied: false,
    }),
  })

  const data = await res.json()
  return { success: data.success, id: data.result?.id }
}

export async function deleteDnsRecord(recordId: string): Promise<void> {
  const config = getConfig()
  if (!config) return

  await fetch(`${CF_API}/zones/${config.zoneId}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${config.apiToken}` },
  })
}

export function isDnsConfigured(): boolean {
  return !!getConfig()
}
