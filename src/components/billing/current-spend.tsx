import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CurrentSpendProps {
  baseCost: number
  tokenCost: number
  totalCost: number
  creditBalance?: number
  autoTopupEnabled?: boolean
  autoTopupAmountEur?: number
  autoTopupThresholdEur?: number
  autoTopupFailed?: boolean
}

export function CurrentSpend({
  baseCost,
  tokenCost,
  totalCost,
  creditBalance,
  autoTopupEnabled,
  autoTopupAmountEur,
  autoTopupThresholdEur,
  autoTopupFailed,
}: CurrentSpendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits & Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {creditBalance !== undefined && (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Available Balance</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(creditBalance)}</p>
              </div>
              <Badge variant={autoTopupEnabled ? 'default' : 'outline'}>
                {autoTopupEnabled ? 'Auto top-up on' : 'Auto top-up off'}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {autoTopupEnabled && autoTopupAmountEur !== undefined && autoTopupThresholdEur !== undefined
                ? `When your balance falls below ${formatCurrency(autoTopupThresholdEur)}, we add ${formatCurrency(autoTopupAmountEur)} automatically.`
                : 'AI requests use this balance. Turn on auto top-up below to refill it automatically.'}
            </p>
            {autoTopupFailed && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                Auto top-up failed. Update your payment method, then save the setup below to retry.
              </div>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">AI usage this month</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(totalCost)}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Token spend</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(tokenCost)}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Compute</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(baseCost)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Credits cover AI usage. Compute and plan charges are shown separately so it is clear what is prepaid vs billed monthly.
        </p>
      </CardContent>
    </Card>
  )
}
