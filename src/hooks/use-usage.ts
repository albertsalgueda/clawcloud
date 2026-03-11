import useSWR from 'swr'
import type { UsageSummary } from '@/types/billing'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useUsage(instanceId?: string, period?: string) {
  const params = new URLSearchParams()
  if (instanceId) params.set('instanceId', instanceId)
  if (period) params.set('period', period)

  const { data, error, isLoading } = useSWR<UsageSummary>(
    `/api/billing/usage?${params.toString()}`,
    fetcher
  )

  return {
    usage: data ?? null,
    isLoading,
    isError: !!error,
  }
}
