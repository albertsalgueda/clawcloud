'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InstanceStatusBadge } from './instance-status'
import { PLANS, REGIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Copy, MapPin, Server } from 'lucide-react'
import { toast } from 'sonner'
import type { Instance } from '@/types/instance'

export function InstanceCard({ instance }: { instance: Instance }) {
  const params = useParams<{ orgSlug: string }>()
  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]
  const orgSlug = params.orgSlug

  function copyIp() {
    if (instance.ip_address) {
      navigator.clipboard.writeText(instance.ip_address)
      toast.success('IP copied to clipboard')
    }
  }

  return (
    <Link href={orgSlug ? `/${orgSlug}/instances/${instance.id}` : `/instances/${instance.id}`}>
      <Card className="float-in cursor-pointer rounded-2xl border border-border bg-card py-0 transition-colors hover:bg-accent/40">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border py-4">
          <div>
            <p className="text-xs text-muted-foreground">{instance.slug}</p>
            <CardTitle className="mt-1 text-lg font-medium">{instance.name}</CardTitle>
          </div>
          <InstanceStatusBadge status={instance.status} />
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full bg-secondary text-secondary-foreground">
              {plan.name}
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-full">
              <MapPin className="h-3 w-3" />
              {region.label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Compute</div>
              <div className="mt-1 font-medium">{plan.vcpu} vCPU</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Memory</div>
              <div className="mt-1 font-medium">{plan.ram_gb} GB RAM</div>
            </div>
          </div>
          {instance.ip_address && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              <span className="font-mono">{instance.ip_address}</span>
              <button
                onClick={(e) => { e.preventDefault(); copyIp() }}
                className="ml-auto rounded-md p-1 transition-colors hover:bg-accent hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Created {formatDate(instance.created_at)}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
