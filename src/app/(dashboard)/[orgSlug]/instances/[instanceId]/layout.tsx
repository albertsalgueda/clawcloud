import { InstanceTabs } from '@/components/instances/instance-tabs'

export default async function InstanceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string; instanceId: string }>
}) {
  const { orgSlug, instanceId } = await params

  return (
    <div className="flex min-h-full flex-col">
      <InstanceTabs instanceId={instanceId} orgSlug={orgSlug} />
      <div className="min-h-0 flex-1">
        {children}
      </div>
    </div>
  )
}
