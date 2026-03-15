import { InstanceTabs } from '@/components/instances/instance-tabs'

export default async function InstanceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params

  return (
    <div>
      <InstanceTabs instanceId={instanceId} />
      {children}
    </div>
  )
}
