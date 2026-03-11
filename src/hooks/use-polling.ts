import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function usePolling<T>(url: string | null, intervalMs = 30000) {
  const { data, error, isLoading } = useSWR<T>(url, fetcher, {
    refreshInterval: intervalMs,
    revalidateOnFocus: false,
  })

  return {
    data: data ?? null,
    isLoading,
    isError: !!error,
  }
}
