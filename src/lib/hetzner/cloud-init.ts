interface CloudInitParams {
  instanceId: string
  customerId: string
  slug: string
  proxyBaseUrl: string
  openclawConfig: string
  openclawVersion: string
  gatewayToken: string
  domain: string
  sshPublicKey?: string
}

function b64(text: string): string {
  return Buffer.from(text).toString('base64')
}

function buildOpenClawEnv(params: CloudInitParams): string {
  return `AI_GATEWAY_API_KEY=${params.gatewayToken}
`
}

function buildEnvFile(params: CloudInitParams): string {
  return `INSTANCE_ID=${params.instanceId}
CUSTOMER_ID=${params.customerId}
`
}

function buildCaddyfile(hostname: string): string {
  const routes = `    handle /gateway/* {
        uri strip_prefix /gateway
        reverse_proxy localhost:18789
    }
    handle /terminal* {
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
ExecStart=/snap/bin/ttyd -p 7681 -b /terminal -W -w /home/openclaw/workspace -t rendererType=canvas -t fontSize=14 -t lineHeight=1.25 -t cursorBlink=true -t disableLeaveAlert=true -t disableResizeOverlay=true -t titleFixed=ClawCloud\ Terminal -t theme={"background":"#050816","foreground":"#d6e4ff","cursor":"#7dd3fc","selectionBackground":"#1d4ed8","black":"#0f172a","red":"#f87171","green":"#34d399","yellow":"#fbbf24","blue":"#60a5fa","magenta":"#c084fc","cyan":"#22d3ee","white":"#e2e8f0","brightBlack":"#475569","brightRed":"#fca5a5","brightGreen":"#6ee7b7","brightYellow":"#fcd34d","brightBlue":"#93c5fd","brightMagenta":"#d8b4fe","brightCyan":"#67e8f9","brightWhite":"#f8fafc"} bash
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
  const openclawEnv = b64(buildOpenClawEnv(params))
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
  - path: /home/openclaw/.openclaw/.env
    permissions: '0600'
    encoding: b64
    content: ${openclawEnv}
  - path: /home/openclaw/.openclaw/openclaw.json
    permissions: '0644'
    encoding: b64
    content: ${configFile}
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
  - DEBIAN_FRONTEND=noninteractive apt-get install -y caddy

  # Write Caddyfile after install so the package default doesn't overwrite it
  - printf '%s' '${caddyFile}' | base64 -d > /etc/caddy/Caddyfile

  # ttyd
  - snap install ttyd --classic

  # Fix home directory ownership before installs (write_files runs as root)
  - mkdir -p /home/openclaw/.npm /home/openclaw/workspace
  - chown -R openclaw:openclaw /home/openclaw

  # OpenClaw (native install as openclaw user, pinned version for UI asset compatibility)
  - su - openclaw -c 'npm install -g openclaw@${params.openclawVersion}'

  # Add npm-global bin to PATH for both login shells (.profile) and interactive shells (.bashrc)
  - su - openclaw -c 'echo "export PATH=\\$HOME/.npm-global/bin:\\$PATH" >> ~/.profile && echo "export PATH=\\$HOME/.npm-global/bin:\\$PATH" >> ~/.bashrc'

  # Playwright browsers for agent browser automation
  - su - openclaw -c 'npx playwright install --with-deps chromium'

  # Start all services
  - systemctl daemon-reload
  - systemctl enable caddy && systemctl start caddy
  - systemctl enable ttyd && systemctl start ttyd
  - systemctl enable openclaw-gateway && systemctl start openclaw-gateway
`
}
