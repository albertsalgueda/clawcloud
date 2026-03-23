'use client'

import { ExternalLink } from 'lucide-react'
import { InstanceTerminalWorkspace } from '@/components/instances/instance-terminal-workspace'
import { buttonVariants } from '@/components/ui/button'
import type { Instance } from '@/types/instance'

export function InstanceDashboard({ instance }: { instance: Instance }) {
  const baseUrl = instance.dashboard_url ?? (instance.ip_address ? `http://${instance.ip_address}` : null)
  const dashboardUrl = baseUrl
    ? instance.gateway_token
      ? `${baseUrl}/#token=${instance.gateway_token}`
      : baseUrl
    : null

  return (
    <section className="flex flex-col gap-4">
      <InstanceTerminalWorkspace instance={instance} />

      {dashboardUrl && (
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-fit' })}
        >
          <ExternalLink className="h-4 w-4" />
          Open Control UI
        </a>
      )}
    </section>
  )
}
