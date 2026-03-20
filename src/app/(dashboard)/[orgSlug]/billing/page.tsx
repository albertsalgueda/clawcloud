'use client'

import { useInstances } from '@/hooks/use-instances'
import { useUsage } from '@/hooks/use-usage'
import { useCredits } from '@/hooks/use-credits'
import { CurrentSpend } from '@/components/billing/current-spend'
import { PlanCard } from '@/components/billing/plan-card'
import { UsageByModelTable } from '@/components/billing/usage-by-model'
import { BillingPortalButton } from '@/components/billing/billing-portal-button'
import { AddCreditsButton } from '@/components/billing/add-credits-button'
import { AutoTopupSettings } from '@/components/billing/auto-topup-settings'
import { CreditActivity } from '@/components/billing/credit-activity'
import { UsageAnalytics } from '@/components/billing/usage-analytics'
import { Loading } from '@/components/shared/loading'

export default function BillingPage() {
  const { usage, isLoading: usageLoading } = useUsage()
  const { credits, isLoading: creditsLoading, mutate } = useCredits()
  const { instances, isLoading: instancesLoading } = useInstances()

  if (creditsLoading || instancesLoading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="flex items-center gap-2">
          <AddCreditsButton
            amountEur={credits?.auto_topup_amount_eur ?? 20}
            label="+ Add Credits"
            onSuccess={() => mutate()}
          />
          <BillingPortalButton />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <CurrentSpend
          baseCost={usage?.base_cost ?? 0}
          tokenCost={usage?.token_cost ?? 0}
          totalCost={usage?.total_cost ?? 0}
          creditBalance={credits?.credit_balance_eur}
          autoTopupEnabled={credits?.auto_topup_enabled}
          autoTopupAmountEur={credits?.auto_topup_amount_eur}
          autoTopupThresholdEur={credits?.auto_topup_threshold_eur}
          autoTopupFailed={credits?.auto_topup_failed}
        />
        <PlanCard currentPlan="starter" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {credits && (
          <AutoTopupSettings
            enabled={credits.auto_topup_enabled}
            amountEur={credits.auto_topup_amount_eur}
            thresholdEur={credits.auto_topup_threshold_eur}
            failed={credits.auto_topup_failed}
            onUpdate={() => mutate()}
          />
        )}
        <CreditActivity transactions={credits?.recent_transactions ?? []} />
      </div>

      <UsageAnalytics instances={instances} />
      <UsageByModelTable data={usage?.by_model ?? []} />
    </div>
  )
}
