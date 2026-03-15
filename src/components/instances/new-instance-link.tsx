'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function NewInstanceLink() {
  const params = useParams<{ orgSlug: string }>()

  return (
    <Link href={`/${params.orgSlug}/instances/new`} className={buttonVariants({ className: 'h-10 rounded-xl px-4' })}>
      <Plus className="mr-2 h-4 w-4" />
      New Instance
    </Link>
  )
}
