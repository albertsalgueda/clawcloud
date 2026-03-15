import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const { org } = await requireAuth()

  if (org.slug !== orgSlug) {
    redirect(`/${org.slug}/instances`)
  }

  return <>{children}</>
}
