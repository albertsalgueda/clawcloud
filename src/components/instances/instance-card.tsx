'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InstanceStatusBadge } from './instance-status'
import { PLANS, REGIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Copy, MapPin, Server } from 'lucide-react'
import { toast } from 'sonner'
import type { Instance } from '@/types/instance'

export function InstanceCard({ instance }: { instance: Instance }) {
  const plan = PLANS[instance.plan]
  const region = REGIONS[instance.region]

  function copyIp() {
    if (instance.ip_address) {
      navigator.clipboard.writeText(instance.ip_address)
      toast.success('IP copied to clipboard')
    }
  }

  return (
    <Link href={`/instances/${instance.id}`}>
      <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">{instance.name}</CardTitle>
          <InstanceStatusBadge status={instance.status} />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground font-mono">{instance.slug}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{plan.name}</Badge>
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {region.label}
            </Badge>
          </div>
          {instance.ip_address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              <span className="font-mono">{instance.ip_address}</span>
              <button
                onClick={(e) => { e.preventDefault(); copyIp() }}
                className="hover:text-foreground transition-colors"
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
