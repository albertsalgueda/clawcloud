'use client'

import { useUsage } from '@/hooks/use-usage'
import { useCredits } from '@/hooks/use-credits'
import { CurrentSpend } from '@/components/billing/current-spend'
import { PlanCard } from '@/components/billing/plan-card'
import { UsageChart } from '@/components/billing/usage-chart'
import { UsageByModelTable } from '@/components/billing/usage-by-model'
import { BillingPortalButton } from '@/components/billing/billing-portal-button'
import { AddCreditsButton } from '@/components/billing/add-credits-button'
import { AutoTopupSettings } from '@/components/billing/auto-topup-settings'
import { Loading } from '@/components/shared/loading'

export default function BillingPage() {
  const { usage, isLoading: usageLoading } = useUsage()
  const { credits, isLoading: creditsLoading, mutate } = useCredits()

  if (usageLoading || creditsLoading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="flex items-center gap-2">
          <AddCreditsButton onSuccess={() => mutate()} />
          <BillingPortalButton />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CurrentSpend
          baseCost={usage?.base_cost ?? 0}
          totalCost={usage?.total_cost ?? 0}
          creditBalance={credits?.credit_balance_eur}
          autoTopupFailed={credits?.auto_topup_failed}
        />
        <PlanCard currentPlan="starter" />
      </div>
      {credits && (
        <AutoTopupSettings
          enabled={credits.auto_topup_enabled}
          amountEur={credits.auto_topup_amount_eur}
          thresholdEur={credits.auto_topup_threshold_eur}
          failed={credits.auto_topup_failed}
          onUpdate={() => mutate()}
        />
      )}
      <UsageChart data={usage?.daily ?? []} />
      <UsageByModelTable data={usage?.by_model ?? []} />
    </div>
  )
}
