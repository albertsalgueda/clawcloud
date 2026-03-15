'use client'

import { use } from 'react'
import { useUsage } from '@/hooks/use-usage'
import { UsageChart } from '@/components/billing/usage-chart'
import { UsageByModelTable } from '@/components/billing/usage-by-model'
import { Loading } from '@/components/shared/loading'

export default function InstanceUsagePage({
  params,
}: {
  params: Promise<{ orgSlug: string; instanceId: string }>
}) {
  const { instanceId } = use(params)
  const { usage, isLoading } = useUsage(instanceId)

  if (isLoading) return <Loading />

  return (
    <div className="space-y-6">
      <UsageChart data={usage?.daily ?? []} />
      <UsageByModelTable data={usage?.by_model ?? []} />
    </div>
  )
}
