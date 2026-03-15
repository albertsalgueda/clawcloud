interface CloudInitParams {
  instanceId: string
  customerId: string
  stripeCustomerId: string
  aiGatewayApiKey: string
  stripeRestrictedKey: string
  openclawConfig: string
  openclawVersion: string
  sshPublicKey?: string
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text.split('\n').map(line => pad + line).join('\n')
}

export function generateCloudInit(params: CloudInitParams): string {
  const indentedConfig = indent(params.openclawConfig, 6)

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
          image: openclaw/openclaw:${params.openclawVersion}
          container_name: openclaw
          restart: always
          env_file: .env
          volumes:
            - ./openclaw.json:/home/openclaw/.openclaw/openclaw.json
            - ./workspace:/home/openclaw/workspace
          ports:
            - "3000:3000"
          healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
            interval: 30s
            timeout: 10s
            retries: 3

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
  - systemctl enable docker
  - systemctl start docker
  - cd /opt/openclaw && docker compose pull
  - cd /opt/openclaw && docker compose up -d
  - nohup /opt/openclaw/health-reporter.sh &
`
}
