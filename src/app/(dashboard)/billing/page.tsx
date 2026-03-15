import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function BillingRedirect() {
  const { org } = await requireAuth()
  redirect(`/${org.slug}/billing`)
}
