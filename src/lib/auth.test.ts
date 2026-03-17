import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockCookies = vi.fn()
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`)
})
const mockFrom = vi.fn()

vi.mock('next/headers', () => ({
  cookies: (...args: unknown[]) => mockCookies(...args),
}))

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  canManageInstance,
  currentUser,
  getOrgByStripeId,
  getProfileByAuthId,
  hasMinRole,
  requireAuth,
  requireOrgRole,
} from './auth'

function queryResult(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.single = vi.fn(async () => result)
  return chain
}

describe('auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    })
  })

  it('returns the current Supabase user', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'auth-user-1', email: 'user@example.com' },
      },
    })

    await expect(currentUser()).resolves.toEqual({
      id: 'auth-user-1',
      email: 'user@example.com',
    })
  })

  it('redirects to login when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    })

    await expect(requireAuth()).rejects.toThrow('redirect:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('loads auth context from the org cookie when membership exists', async () => {
    const profile = { id: 'profile-1', auth_user_id: 'auth-user-1', email: 'u@example.com' }
    const org = { id: 'org-1', slug: 'acme', stripe_customer_id: 'cus_123' }
    const membership = { id: 'mem-1', org_id: 'org-1', user_id: 'profile-1', role: 'admin', created_at: 'now' }

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
    })
    mockCookies.mockResolvedValue({
      get: vi.fn(() => ({ value: 'acme' })),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return queryResult({ data: profile, error: null })
      if (table === 'organizations') return queryResult({ data: org, error: null })
      if (table === 'org_members') return queryResult({ data: membership, error: null })
      return queryResult({ data: null, error: null })
    })

    await expect(requireAuth()).resolves.toEqual({
      profile,
      org,
      membership,
    })
  })

  it('falls back to the first membership when the cookie org is unavailable', async () => {
    const profile = { id: 'profile-1', auth_user_id: 'auth-user-1', email: 'u@example.com' }
    const fallbackOrg = { id: 'org-2', slug: 'fallback-org', stripe_customer_id: 'cus_456' }
    const fallbackMembership = {
      id: 'mem-2',
      org_id: 'org-2',
      user_id: 'profile-1',
      role: 'member',
      created_at: 'now',
      organizations: fallbackOrg,
    }

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return queryResult({ data: profile, error: null })
      if (table === 'org_members') return queryResult({ data: fallbackMembership, error: null })
      return queryResult({ data: null, error: null })
    })

    await expect(requireAuth()).resolves.toEqual({
      profile,
      org: fallbackOrg,
      membership: {
        id: 'mem-2',
        org_id: 'org-2',
        user_id: 'profile-1',
        role: 'member',
        created_at: 'now',
      },
    })
  })

  it('redirects to login when the profile lookup fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return queryResult({ data: null, error: { message: 'not found' } })
      return queryResult({ data: null, error: null })
    })

    await expect(requireAuth()).rejects.toThrow('redirect:/login')
  })

  it('redirects to login when no membership can be resolved', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return queryResult({
          data: { id: 'profile-1', auth_user_id: 'auth-user-1', email: 'u@example.com' },
          error: null,
        })
      }
      if (table === 'org_members') return queryResult({ data: null, error: null })
      return queryResult({ data: null, error: null })
    })

    await expect(requireAuth()).rejects.toThrow('redirect:/login')
  })

  it('enforces the required minimum org role', async () => {
    const profile = { id: 'profile-1', auth_user_id: 'auth-user-1', email: 'u@example.com' }
    const org = { id: 'org-1', slug: 'acme', stripe_customer_id: 'cus_123' }
    const membership = { id: 'mem-1', org_id: 'org-1', user_id: 'profile-1', role: 'member', created_at: 'now' }

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return queryResult({ data: profile, error: null })
      if (table === 'org_members') {
        return queryResult({
          data: {
            ...membership,
            organizations: org,
          },
          error: null,
        })
      }
      return queryResult({ data: null, error: null })
    })

    await expect(requireOrgRole('member')).resolves.toEqual({
      profile,
      org,
      membership,
    })
    await expect(requireOrgRole('admin')).rejects.toThrow(
      'Insufficient permissions: requires admin, has member'
    )
  })

  it('checks instance management and role hierarchy helpers', () => {
    expect(canManageInstance(
      { id: 'm1', org_id: 'org', user_id: 'user-1', role: 'owner', created_at: 'now' },
      { created_by: null }
    )).toBe(true)
    expect(canManageInstance(
      { id: 'm2', org_id: 'org', user_id: 'user-1', role: 'member', created_at: 'now' },
      { created_by: 'user-1' }
    )).toBe(true)
    expect(canManageInstance(
      { id: 'm3', org_id: 'org', user_id: 'user-1', role: 'member', created_at: 'now' },
      { created_by: 'user-2' }
    )).toBe(false)

    expect(hasMinRole('owner', 'admin')).toBe(true)
    expect(hasMinRole('member', 'admin')).toBe(false)
  })

  it('looks up profile and organization records', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return queryResult({ data: { id: 'profile-1' }, error: null })
      if (table === 'organizations') return queryResult({ data: { id: 'org-1' }, error: null })
      return queryResult({ data: null })
    })

    await expect(getProfileByAuthId('auth-user-1')).resolves.toEqual({ id: 'profile-1' })
    await expect(getOrgByStripeId('cus_123')).resolves.toEqual({ id: 'org-1' })
  })
})
