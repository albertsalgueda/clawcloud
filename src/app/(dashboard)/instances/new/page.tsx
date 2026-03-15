import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function NewInstanceRedirect() {
  const { org } = await requireAuth()
  redirect(`/${org.slug}/instances/new`)
}
