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

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text.split('\n').map(line => pad + line).join('\n')
}

export function generateCloudInit(params: CloudInitParams): string {
  const indentedConfig = indent(params.openclawConfig, 6)
  const hostname = `${params.slug}.${params.domain}`

  return `#cloud-config
package_update: true
packages:
  - docker.io
  - docker-compose-v2
  - curl
  - jq
  - debian-keyring
  - debian-archive-keyring
  - apt-transport-https

users:
  - name: openclaw
    shell: /bin/bash
    groups: docker
    sudo: ALL=(ALL) NOPASSWD:ALL
${params.sshPublicKey ? `    ssh_authorized_keys:\n      - ${params.sshPublicKey}` : ''}

write_files:
  - path: /opt/openclaw/.env
    permissions: '0600'
    content: |
      AI_GATEWAY_URL=https://gateway.ai.vercel.app/v1
      AI_GATEWAY_API_KEY=${params.aiGatewayApiKey}
      STRIPE_CUSTOMER_ID=${params.stripeCustomerId}
      STRIPE_RESTRICTED_KEY=${params.stripeRestrictedKey}
      INSTANCE_ID=${params.instanceId}
      CUSTOMER_ID=${params.customerId}

  - path: /opt/openclaw/openclaw.json
    permissions: '0644'
    content: |
${indentedConfig}

  - path: /opt/openclaw/docker-compose.yml
    permissions: '0644'
    content: |
      services:
        openclaw:
          image: ghcr.io/openclaw/openclaw:${params.openclawVersion}
          container_name: openclaw
          restart: always
          env_file: .env
          volumes:
            - ./openclaw.json:/home/openclaw/.openclaw/openclaw.json
            - workspace:/home/openclaw/workspace
          ports:
            - "127.0.0.1:18789:18789"
          healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:18789/healthz"]
            interval: 30s
            timeout: 10s
            retries: 3

        clawport:
          image: node:22-slim
          container_name: clawport
          restart: always
          working_dir: /app
          environment:
            - WORKSPACE_PATH=/workspace
            - OPENCLAW_GATEWAY_URL=http://openclaw:18789
            - OPENCLAW_GATEWAY_TOKEN=${params.gatewayToken}
            - PORT=3000
            - NODE_ENV=production
          volumes:
            - workspace:/workspace:ro
          ports:
            - "127.0.0.1:3000:3000"
          depends_on:
            openclaw:
              condition: service_healthy
          command: >
            sh -c "npm install -g clawport-ui && clawport start"

      volumes:
        workspace:

  - path: /etc/caddy/Caddyfile
    permissions: '0644'
    content: |
      ${hostname} {
          reverse_proxy localhost:3000
      }

  - path: /opt/openclaw/health-reporter.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      while true; do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' openclaw 2>/dev/null || echo "not_running")
        echo "$STATUS" > /opt/openclaw/health-status
        sleep 30
      done

runcmd:
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update
  - apt-get install -y caddy
  - systemctl enable caddy
  - systemctl start caddy
  - systemctl enable docker
  - systemctl start docker
  - cd /opt/openclaw && docker compose pull
  - cd /opt/openclaw && docker compose up -d
  - nohup /opt/openclaw/health-reporter.sh &
`
}
