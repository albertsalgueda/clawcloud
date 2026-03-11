import useSWR from 'swr'
import type { Instance } from '@/types/instance'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useInstance(instanceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ instance: Instance }>(
    instanceId ? `/api/instances/${instanceId}` : null,
    fetcher
  )

  return {
    instance: data?.instance ?? null,
    isLoading,
    isError: !!error,
    mutate,
  }
}
