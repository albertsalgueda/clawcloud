import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CreditInfo } from '@/hooks/use-credits'

type CreditTransaction = CreditInfo['recent_transactions'][number]

const typeCopy: Record<CreditTransaction['type'], { label: string; variant: 'default' | 'outline' | 'secondary' }> = {
  topup: { label: 'Top-up', variant: 'default' },
  usage: { label: 'Usage', variant: 'outline' },
  refund: { label: 'Refund', variant: 'secondary' },
  manual_adjustment: { label: 'Adjustment', variant: 'secondary' },
}

function getDescription(tx: CreditTransaction) {
  if (tx.description) return tx.description
  if (tx.type === 'usage') {
    return tx.model ? `AI usage on ${tx.model}` : 'AI usage'
  }
  if (tx.type === 'refund') return 'Credit refund'
  if (tx.type === 'manual_adjustment') return 'Manual balance adjustment'
  return 'Credits added'
}

export function CreditActivity({ transactions }: { transactions: CreditInfo['recent_transactions'] }) {
  if (!transactions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Credit Activity</CardTitle>
          <CardDescription>Your latest top-ups and AI usage will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No credit activity yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Credit Activity</CardTitle>
        <CardDescription>Track when credits were added and when AI usage consumed them.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.slice(0, 8).map((tx) => {
              const amount = Number(tx.amount_eur)

              return (
                <TableRow key={tx.id}>
                  <TableCell className="space-y-1 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeCopy[tx.type].variant}>{typeCopy[tx.type].label}</Badge>
                      <span className="font-medium">{getDescription(tx)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell className={`py-3 text-right font-medium ${amount < 0 ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {amount > 0 ? '+' : ''}
                    {formatCurrency(amount)}
                  </TableCell>
                  <TableCell className="py-3 text-right text-muted-foreground">
                    {formatCurrency(Number(tx.balance_after_eur))}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
