import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function InstanceSettingsRedirect({
  params,
}: {
  params: Promise<{ instanceId: string }>
}) {
  const { instanceId } = await params
  const { org } = await requireAuth()
  redirect(`/${org.slug}/instances/${instanceId}/settings`)
}
