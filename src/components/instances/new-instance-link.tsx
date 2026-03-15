'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function NewInstanceLink() {
  return (
    <Link href="/instances/new" className={buttonVariants({ className: 'warm-glow h-11 rounded-2xl px-4' })}>
      <Plus className="mr-2 h-4 w-4" />
      New Instance
    </Link>
  )
}
