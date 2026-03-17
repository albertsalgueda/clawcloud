interface CloudInitParams {
  instanceId: string
  customerId: string
  slug: string
  stripeCustomerId: string
  aiGatewayApiKey: string
  stripeRestrictedKey: string
  openclawConfig: string
  openclawVersion: string
  gatewayToken: string
  domain: string
  sshPublicKey?: string
}

function b64(text: string): string {
  return Buffer.from(text).toString('base64')
}

function buildEnvFile(params: CloudInitParams): string {
  return `AI_GATEWAY_URL=https://gateway.ai.vercel.app/v1
AI_GATEWAY_API_KEY=${params.aiGatewayApiKey}
STRIPE_CUSTOMER_ID=${params.stripeCustomerId}
STRIPE_RESTRICTED_KEY=${params.stripeRestrictedKey}
INSTANCE_ID=${params.instanceId}
CUSTOMER_ID=${params.customerId}
`
}

function buildCaddyfile(hostname: string): string {
  const routes = `    handle /gateway/* {
        uri strip_prefix /gateway
        reverse_proxy localhost:18789
    }
    handle /terminal/* {
        uri strip_prefix /terminal
        reverse_proxy localhost:7681
    }
    handle /terminal {
        reverse_proxy localhost:7681
    }
    handle {
        reverse_proxy localhost:18789
    }
    header {
        -X-Frame-Options
        -Content-Security-Policy
    }`

  return `${hostname} {
${routes}
}

:80 {
${routes}
}
`
}

function buildTtydService(): string {
  return `[Unit]
Description=ttyd web terminal
After=network.target

[Service]
Type=simple
User=openclaw
ExecStart=/snap/bin/ttyd -p 7681 -W -t fontSize=14 -t theme={"background":"#0a0a0a","foreground":"#e0e0e0"} bash
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`
}

function buildGatewayService(): string {
  return `[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/home/openclaw
ExecStart=/home/openclaw/.npm-global/bin/openclaw gateway run
Restart=always
RestartSec=5
Environment=HOME=/home/openclaw
Environment=PATH=/home/openclaw/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
`
}

export function generateCloudInit(params: CloudInitParams): string {
  const hostname = `${params.slug}.${params.domain}`

  const envFile = b64(buildEnvFile(params))
  const configFile = b64(params.openclawConfig)
  const caddyFile = b64(buildCaddyfile(hostname))
  const ttydService = b64(buildTtydService())
  const gatewayService = b64(buildGatewayService())

  return `#cloud-config
package_update: true
packages:
  - curl
  - jq

users:
  - name: openclaw
    shell: /bin/bash
    groups: sudo
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${params.sshPublicKey ?? ''}

write_files:
  - path: /home/openclaw/.env
    permissions: '0600'
    encoding: b64
    content: ${envFile}
  - path: /home/openclaw/.openclaw/openclaw.json
    permissions: '0644'
    encoding: b64
    content: ${configFile}
  - path: /etc/caddy/Caddyfile
    permissions: '0644'
    encoding: b64
    content: ${caddyFile}
  - path: /etc/systemd/system/ttyd.service
    permissions: '0644'
    encoding: b64
    content: ${ttydService}
  - path: /etc/systemd/system/openclaw-gateway.service
    permissions: '0644'
    encoding: b64
    content: ${gatewayService}

runcmd:
  # Node.js 22 via NodeSource
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs

  # Caddy (non-interactive to avoid Caddyfile conflict prompt)
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update
  - DEBIAN_FRONTEND=noninteractive apt-get install -y -o Dpkg::Options::='--force-confnew' caddy

  # ttyd
  - snap install ttyd --classic

  # Fix home directory ownership before installs (write_files runs as root)
  - mkdir -p /home/openclaw/.npm /home/openclaw/workspace
  - chown -R openclaw:openclaw /home/openclaw

  # OpenClaw (native install as openclaw user)
  - su - openclaw -c 'curl -fsSL https://openclaw.ai/install.sh | bash'

  # Add npm-global bin to openclaw PATH for interactive/login sessions
  - su - openclaw -c 'echo "export PATH=\\$HOME/.npm-global/bin:\\$PATH" >> ~/.profile'

  # Playwright browsers for agent browser automation
  - su - openclaw -c 'npx playwright install --with-deps chromium'

  # Start all services
  - systemctl daemon-reload
  - systemctl enable caddy && systemctl start caddy
  - systemctl enable ttyd && systemctl start ttyd
  - systemctl enable openclaw-gateway && systemctl start openclaw-gateway
`
}
