import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export type OrgRole = 'owner' | 'admin' | 'member'

export interface Profile {
  id: string
  auth_user_id: string
  email: string
  name: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  stripe_customer_id: string | null
  plan: string
  max_instances: number
  created_at: string
  updated_at: string
}

export interface OrgMembership {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  created_at: string
}

export interface AuthContext {
  profile: Profile
  org: Organization
  membership: OrgMembership
}

const ORG_COOKIE = 'clawcloud-org'

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  member: 0,
  admin: 1,
  owner: 2,
}

export async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth(): Promise<AuthContext> {
  const user = await currentUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/d6f6e5dc-5e2a-4684-afdc-f324e215d821',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3dde84'},body:JSON.stringify({sessionId:'3dde84',location:'auth.ts:profile-query',message:'Profile lookup result',data:{hasProfile:!!profile,profileError:profileError?.message??null,userId:user.id},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
  // #endregion

  if (profileError || !profile) {
    redirect('/login')
  }

  const cookieStore = await cookies()
  const orgSlug = cookieStore.get(ORG_COOKIE)?.value

  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/d6f6e5dc-5e2a-4684-afdc-f324e215d821',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3dde84'},body:JSON.stringify({sessionId:'3dde84',location:'auth.ts:cookie-read',message:'Org cookie value',data:{orgSlug:orgSlug??'(none)',profileId:profile.id},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
  // #endregion

  let org: Organization | null = null
  let membership: OrgMembership | null = null

  if (orgSlug) {
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', orgSlug)
      .single()

    if (orgData) {
      const { data: memberData } = await supabaseAdmin
        .from('org_members')
        .select('*')
        .eq('org_id', orgData.id)
        .eq('user_id', profile.id)
        .single()

      if (memberData) {
        org = orgData as Organization
        membership = memberData as OrgMembership
      }
    }
  }

  if (!org || !membership) {
    const { data: firstMembership, error: fallbackError } = await supabaseAdmin
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    // #region agent log
    fetch('http://127.0.0.1:7806/ingest/d6f6e5dc-5e2a-4684-afdc-f324e215d821',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3dde84'},body:JSON.stringify({sessionId:'3dde84',location:'auth.ts:fallback-org',message:'Fallback org lookup',data:{hasMembership:!!firstMembership,hasOrg:!!firstMembership?.organizations,fallbackError:fallbackError?.message??null},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
    // #endregion

    if (!firstMembership || !firstMembership.organizations) {
      redirect('/login')
    }

    org = firstMembership.organizations as unknown as Organization
    membership = {
      id: firstMembership.id,
      org_id: firstMembership.org_id,
      user_id: firstMembership.user_id,
      role: firstMembership.role,
      created_at: firstMembership.created_at,
    } as OrgMembership
  }

  // #region agent log
  fetch('http://127.0.0.1:7806/ingest/d6f6e5dc-5e2a-4684-afdc-f324e215d821',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3dde84'},body:JSON.stringify({sessionId:'3dde84',location:'auth.ts:result',message:'requireAuth resolved',data:{orgSlug:org.slug,orgName:org.name,role:membership.role,profileId:profile.id},timestamp:Date.now(),hypothesisId:'H-A,H-B'})}).catch(()=>{});
  // #endregion

  return {
    profile: profile as Profile,
    org,
    membership,
  }
}

export async function requireOrgRole(minRole: OrgRole): Promise<AuthContext> {
  const ctx = await requireAuth()
  const required = ROLE_HIERARCHY[minRole]
  const actual = ROLE_HIERARCHY[ctx.membership.role]

  if (actual < required) {
    throw new Error(`Insufficient permissions: requires ${minRole}, has ${ctx.membership.role}`)
  }

  return ctx
}

export function canManageInstance(membership: OrgMembership, instance: { created_by: string | null }): boolean {
  if (membership.role === 'owner' || membership.role === 'admin') {
    return true
  }
  return instance.created_by === membership.user_id
}

export function hasMinRole(role: OrgRole, minRole: OrgRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

export async function getProfileByAuthId(authUserId: string): Promise<Profile | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  return data as Profile | null
}

export async function getOrgByStripeId(stripeCustomerId: string): Promise<Organization | null> {
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()

  return data as Organization | null
}
