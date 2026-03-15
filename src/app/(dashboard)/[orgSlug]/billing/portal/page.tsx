'use client'

import { useEffect } from 'react'
import { Loading } from '@/components/shared/loading'
import { toast } from 'sonner'

export default function BillingPortalPage() {
  useEffect(() => {
    async function redirect() {
      try {
        const res = await fetch('/api/billing/portal', { method: 'POST' })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          toast.error('Failed to open billing portal')
        }
      } catch {
        toast.error('Failed to open billing portal')
      }
    }
    redirect()
  }, [])

  return <Loading />
}
