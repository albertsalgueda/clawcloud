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
    <div>
      <InstanceTabs instanceId={instanceId} orgSlug={orgSlug} />
      {children}
    </div>
  )
}
