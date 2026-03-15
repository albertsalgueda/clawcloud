import { NextResponse } from 'next/server'
import { requireAuth, requireOrgRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
})

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const { org } = await requireAuth()

  if (org.slug !== orgSlug) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const { data: members, error } = await supabaseAdmin
    .from('org_members')
    .select('id, role, created_at, profiles(id, email, name)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formatted = members?.map(m => ({
    id: m.id,
    role: m.role,
    created_at: m.created_at,
    user: m.profiles,
  })) ?? []

  return NextResponse.json({ members: formatted })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const { org } = await requireOrgRole('admin')

  if (org.slug !== orgSlug) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, role } = parsed.data

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 })
  }

  const { data: existing } = await supabaseAdmin
    .from('org_members')
    .select('id')
    .eq('org_id', org.id)
    .eq('user_id', profile.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
  }

  const { data: member, error } = await supabaseAdmin
    .from('org_members')
    .insert({ org_id: org.id, user_id: profile.id, role })
    .select('id, role, created_at, profiles(id, email, name)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    member: {
      id: member.id,
      role: member.role,
      created_at: member.created_at,
      user: member.profiles,
    },
  }, { status: 201 })
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
  const { memberId, ...rest } = body
  const parsed = updateMemberSchema.safeParse(rest)
  if (!parsed.success || !memberId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (parsed.data.role === 'owner') {
    const { org: ownerOrg } = await requireOrgRole('owner')
    if (ownerOrg.slug !== orgSlug) {
      return NextResponse.json({ error: 'Only owners can promote to owner' }, { status: 403 })
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from('org_members')
    .update({ role: parsed.data.role })
    .eq('id', memberId)
    .eq('org_id', org.id)
    .select('id, role, created_at, profiles(id, email, name)')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  return NextResponse.json({
    member: {
      id: updated.id,
      role: updated.role,
      created_at: updated.created_at,
      user: updated.profiles,
    },
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const { org } = await requireOrgRole('admin')

  if (org.slug !== orgSlug) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')
  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  }

  const { data: member } = await supabaseAdmin
    .from('org_members')
    .select('id, role, user_id')
    .eq('id', memberId)
    .eq('org_id', org.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (member.role === 'owner') {
    const { count } = await supabaseAdmin
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('role', 'owner')

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 })
    }
  }

  await supabaseAdmin
    .from('org_members')
    .delete()
    .eq('id', memberId)

  return new NextResponse(null, { status: 204 })
}
