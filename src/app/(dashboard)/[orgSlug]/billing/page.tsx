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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownToLine, CreditCard, Sparkles } from 'lucide-react'

export default function BillingPage() {
  const { usage, isLoading: usageLoading } = useUsage()
  const { credits, isLoading: creditsLoading, mutate } = useCredits()
  const { instances, isLoading: instancesLoading } = useInstances()

  if (usageLoading || creditsLoading || instancesLoading) return <Loading />

  const topUpNowLabel = credits
    ? `Top Up €${credits.auto_topup_amount_eur} Now`
    : 'Top Up Now'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Keep an eye on your AI credit balance, monthly usage, and the automatic refill setup that buys more credits when your balance gets low.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddCreditsButton
            amountEur={credits?.auto_topup_amount_eur ?? 20}
            label={topUpNowLabel}
            onSuccess={() => mutate()}
          />
          <BillingPortalButton />
        </div>
      </div>

      <Card className="border border-border/70 bg-gradient-to-br from-muted/40 via-background to-background">
        <CardHeader>
          <CardTitle>How billing works</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <p className="mt-3 font-medium">AI usage spends credits</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every model request deducts from your credit balance, so the balance card tells you how much AI usage you can still run.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
            <p className="mt-3 font-medium">Auto top-up refills low balances</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a refill amount and a threshold. When the balance drops below that threshold, we charge your default card and add more credits automatically.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 p-4">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <p className="mt-3 font-medium">Cards and invoices live in Stripe</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the billing portal to update payment methods, recover from failed top-ups, and review invoices in one place.
            </p>
          </div>
        </CardContent>
      </Card>

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
