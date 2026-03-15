'use client'

import { use } from 'react'
import { MembersManager } from '@/components/org/members-manager'

export default function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = use(params)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to this organization and their roles.
        </p>
      </div>
      <MembersManager orgSlug={orgSlug} />
    </div>
  )
}
