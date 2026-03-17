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

function buildDockerCompose(params: CloudInitParams): string {
  const hostname = `${params.slug}.${params.domain}`
  return `services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:${params.openclawVersion}
    container_name: openclaw
    restart: always
    env_file: .env
    volumes:
      - ./config:/home/node/.openclaw
      - workspace:/home/node/workspace
    ports:
      - "18789:18789"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:18789/healthz"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  clawport:
    image: node:22-slim
    container_name: clawport
    restart: always
    working_dir: /app
    environment:
      - WORKSPACE_PATH=/workspace
      - OPENCLAW_GATEWAY_URL=http://openclaw:18789
      - OPENCLAW_GATEWAY_TOKEN=${params.gatewayToken}
      - NEXT_PUBLIC_OPENCLAW_GATEWAY_URL=wss://${hostname}/gateway
      - PORT=3000
      - NODE_ENV=production
    volumes:
      - workspace:/workspace:ro
    ports:
      - "3000:3000"
    depends_on:
      openclaw:
        condition: service_healthy
    command: sh -c "npm install -g clawport-ui && clawport start"

volumes:
  workspace:
`
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

function buildTtydService(): string {
  return `[Unit]
Description=ttyd web terminal
After=network.target docker.service

[Service]
Type=simple
User=openclaw
ExecStart=/usr/bin/ttyd -p 7681 -W -t fontSize=14 -t theme={"background":"#0a0a0a","foreground":"#e0e0e0"} bash
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`
}

function buildCaddyfile(hostname: string): string {
  return `${hostname} {
    handle /gateway/* {
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
        reverse_proxy localhost:3000
    }
    header {
        X-Frame-Options ""
        Content-Security-Policy ""
    }
}
`
}

export function generateCloudInit(params: CloudInitParams): string {
  const hostname = `${params.slug}.${params.domain}`

  const envFile = b64(buildEnvFile(params))
  const configFile = b64(params.openclawConfig)
  const composeFile = b64(buildDockerCompose(params))
  const caddyFile = b64(buildCaddyfile(hostname))
  const ttydService = b64(buildTtydService())

  return `#cloud-config
package_update: true
packages:
  - docker.io
  - docker-compose-v2
  - curl
  - jq

users:
  - name: openclaw
    shell: /bin/bash
    groups: docker,sudo
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${params.sshPublicKey ?? ''}

write_files:
  - path: /opt/openclaw/.env
    permissions: '0600'
    encoding: b64
    content: ${envFile}
  - path: /opt/openclaw/config/openclaw.json
    permissions: '0644'
    encoding: b64
    content: ${configFile}
  - path: /opt/openclaw/docker-compose.yml
    permissions: '0644'
    encoding: b64
    content: ${composeFile}
  - path: /etc/caddy/Caddyfile
    permissions: '0644'
    encoding: b64
    content: ${caddyFile}
  - path: /etc/systemd/system/ttyd.service
    permissions: '0644'
    encoding: b64
    content: ${ttydService}

runcmd:
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update
  - apt-get install -y caddy
  - curl -sL https://github.com/nicholasgasior/gttyd/releases/download/1.7.2/ttyd.x86_64 -o /usr/bin/ttyd && chmod +x /usr/bin/ttyd || apt-get install -y ttyd || true
  - chown -R openclaw:openclaw /opt/openclaw
  - chown -R 1000:1000 /opt/openclaw/config
  - systemctl enable caddy && systemctl start caddy
  - systemctl enable docker && systemctl start docker
  - systemctl enable ttyd && systemctl start ttyd
  - cd /opt/openclaw && docker compose pull
  - cd /opt/openclaw && docker compose up -d
`
}
