'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS } from '@/lib/constants'
import type { PlanKey } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Cpu, MemoryStick, Server } from 'lucide-react'

export function PlanCard({ currentPlan }: { currentPlan: PlanKey }) {
  const plan = PLANS[currentPlan]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-base px-3 py-1">{plan.name}</Badge>
          <span className="text-lg font-semibold">{formatCurrency(plan.price_eur)}/mo</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4" /> {plan.vcpu} vCPU
          </div>
          <div className="flex items-center gap-1.5">
            <MemoryStick className="h-4 w-4" /> {plan.ram_gb} GB
          </div>
          <div className="flex items-center gap-1.5">
            <Server className="h-4 w-4" /> {plan.max_instances} inst.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
