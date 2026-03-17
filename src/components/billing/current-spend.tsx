import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface CurrentSpendProps {
  baseCost: number
  totalCost: number
  creditBalance?: number
  autoTopupFailed?: boolean
}

export function CurrentSpend({
  baseCost,
  totalCost,
  creditBalance,
  autoTopupFailed,
}: CurrentSpendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
      </CardHeader>
      <CardContent>
        {creditBalance !== undefined && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">Credit Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(creditBalance)}</p>
            {autoTopupFailed && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                Auto top-up failed. Please update your payment method.
              </div>
            )}
          </div>
        )}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{formatCurrency(totalCost)} AI usage this month</p>
          <p>{formatCurrency(baseCost)} compute</p>
        </div>
      </CardContent>
    </Card>
  )
}
