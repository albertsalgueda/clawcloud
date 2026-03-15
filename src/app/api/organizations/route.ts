import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const createOrgSchema = z.object({
  name: z.string().min(2).max(50),
})

export async function GET() {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: memberships, error } = await supabaseAdmin
    .from('org_members')
    .select('role, created_at, organizations(*)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/d6f6e5dc-5e2a-4684-afdc-f324e215d821',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3dde84'},body:JSON.stringify({sessionId:'3dde84',location:'api/organizations/route.ts:GET',message:'Memberships raw data',data:{count:memberships?.length??0,firstRaw:memberships?.[0]??null},timestamp:Date.now(),hypothesisId:'H-E'})}).catch(()=>{});
  // #endregion

  const orgs = memberships?.map(m => ({
    ...m.organizations,
    role: m.role,
  })) ?? []

  return NextResponse.json({ organizations: orgs })
}

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = createOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name } = parsed.data
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 8)

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ name, slug })
    .select()
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? 'Failed to create organization' }, { status: 500 })
  }

  await supabaseAdmin
    .from('org_members')
    .insert({ org_id: org.id, user_id: profile.id, role: 'owner' })

  return NextResponse.json({ organization: org }, { status: 201 })
}
