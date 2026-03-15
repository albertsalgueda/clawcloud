import { requireAuth, hasMinRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'
import Link from 'next/link'

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const { org, membership } = await requireAuth()

  if (!hasMinRole(membership.role, 'admin')) {
    redirect(`/${orgSlug}/instances`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Organization Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={org.name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={org.slug} disabled />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Input value={org.plan} disabled className="capitalize" />
          </div>
          <div className="space-y-2">
            <Label>Max Instances</Label>
            <Input value={String(org.max_instances)} disabled />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage team members in the{' '}
          <Link href={`/${orgSlug}/settings/members`} className="underline hover:text-foreground">
            Team page
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
