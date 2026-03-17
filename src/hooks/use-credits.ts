import useSWR from 'swr'

interface CreditTransaction {
  id: string
  type: 'topup' | 'usage' | 'refund' | 'manual_adjustment'
  amount_eur: string
  balance_after_eur: string
  model: string | null
  description: string | null
  created_at: string
}

export interface CreditInfo {
  credit_balance_eur: number
  auto_topup_enabled: boolean
  auto_topup_amount_eur: number
  auto_topup_threshold_eur: number
  auto_topup_failed: boolean
  recent_transactions: CreditTransaction[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCredits() {
  const { data, error, isLoading, mutate } = useSWR<CreditInfo>(
    '/api/billing/credits',
    fetcher,
    { refreshInterval: 30_000 },
  )

  return {
    credits: data ?? null,
    isLoading,
    isError: !!error,
    mutate,
  }
}
