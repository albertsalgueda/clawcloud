'use client'

import { useUsage } from '@/hooks/use-usage'
import { CurrentSpend } from '@/components/billing/current-spend'
import { PlanCard } from '@/components/billing/plan-card'
import { UsageChart } from '@/components/billing/usage-chart'
import { UsageByModelTable } from '@/components/billing/usage-by-model'
import { BillingPortalButton } from '@/components/billing/billing-portal-button'
import { Loading } from '@/components/shared/loading'

export default function BillingPage() {
  const { usage, isLoading } = useUsage()

  if (isLoading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <BillingPortalButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CurrentSpend
          baseCost={usage?.base_cost ?? 0}
          tokenCost={usage?.token_cost ?? 0}
          totalCost={usage?.total_cost ?? 0}
        />
        <PlanCard currentPlan="starter" />
      </div>
      <UsageChart data={usage?.daily ?? []} />
      <UsageByModelTable data={usage?.by_model ?? []} />
    </div>
  )
}
