import useSWR from 'swr'
import type { Instance } from '@/types/instance'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useInstances() {
  const { data, error, isLoading, mutate } = useSWR<{ instances: Instance[] }>(
    '/api/instances',
    fetcher
  )

  return {
    instances: data?.instances ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
