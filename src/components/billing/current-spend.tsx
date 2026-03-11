import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface CurrentSpendProps {
  baseCost: number
  tokenCost: number
  totalCost: number
}

export function CurrentSpend({ baseCost, tokenCost, totalCost }: CurrentSpendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>{formatCurrency(baseCost)} compute</p>
          <p>{formatCurrency(tokenCost)} AI usage</p>
        </div>
      </CardContent>
    </Card>
  )
}
