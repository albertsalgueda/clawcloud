import { NextResponse } from 'next/server'
import { requireAuth, requireOrgRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateOrgSchema = z.object({
  name: z.string().min(2).max(50).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const { org, membership } = await requireAuth()

  if (org.slug !== orgSlug) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  return NextResponse.json({ organization: org, role: membership.role })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const { org } = await requireOrgRole('admin')

  if (org.slug !== orgSlug) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name) updates.name = parsed.data.name

  const { data: updated, error } = await supabaseAdmin
    .from('organizations')
    .update(updates)
    .eq('id', org.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ organization: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const { org } = await requireOrgRole('owner')

  if (org.slug !== orgSlug) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const { count } = await supabaseAdmin
    .from('instances')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .not('status', 'in', '("deleted","deleting")')

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Delete all instances before deleting the organization' },
      { status: 400 }
    )
  }

  await supabaseAdmin
    .from('organizations')
    .delete()
    .eq('id', org.id)

  return new NextResponse(null, { status: 204 })
}
