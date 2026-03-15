'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InstanceStatusBadge } from './instance-status'
import { PLANS, REGIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Copy, MapPin, Server, ArrowUpRight, Cpu, MemoryStick } from 'lucide-react'
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
      <Card className="glass-panel float-in group cursor-pointer rounded-[28px] border-white/10 bg-card/65 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-card/90">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Managed node</p>
            <CardTitle className="mt-2 text-xl font-semibold">{instance.name}</CardTitle>
          </div>
          <InstanceStatusBadge status={instance.status} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-background/30 px-4 py-3">
            <p className="text-sm font-mono text-muted-foreground">{instance.slug}</p>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full border border-white/10 bg-primary/15 px-3 py-1 text-primary">
              {plan.name}
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-full border-white/10 bg-background/25 px-3 py-1">
              <MapPin className="h-3 w-3" />
              {region.label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-background/30 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" />
                Compute
              </div>
              <div className="mt-2 text-lg font-semibold">{plan.vcpu} vCPU</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/30 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <MemoryStick className="h-3.5 w-3.5" />
                Memory
              </div>
              <div className="mt-2 text-lg font-semibold">{plan.ram_gb} GB</div>
            </div>
          </div>
          {instance.ip_address && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              <span className="font-mono">{instance.ip_address}</span>
              <button
                onClick={(e) => { e.preventDefault(); copyIp() }}
                className="ml-auto rounded-full p-1 transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Created {formatDate(instance.created_at)}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
