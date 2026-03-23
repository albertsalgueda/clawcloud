import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const STATIC_SEGMENTS = new Set(['instances', 'billing', 'settings', 'api', 'login', 'signup', 'callback', 'forgot-password', 'reset-password', '_next'])

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/callback') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password')

  const isPublicRoute = request.nextUrl.pathname === '/' ||
    isAuthRoute ||
    request.nextUrl.pathname.startsWith('/api/webhooks') ||
    request.nextUrl.pathname.startsWith('/api/gateway/proxy')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const skipRedirectForAuth = request.nextUrl.pathname.startsWith('/reset-password')

  if (user && isAuthRoute && !skipRedirectForAuth) {
    const orgSlug = request.cookies.get('clawcloud-org')?.value
    const url = request.nextUrl.clone()
    url.pathname = orgSlug ? `/${orgSlug}/instances` : '/'
    return NextResponse.redirect(url)
  }

  if (user) {
    const firstSegment = request.nextUrl.pathname.split('/')[1]
    if (firstSegment && !STATIC_SEGMENTS.has(firstSegment)) {
      const currentCookie = request.cookies.get('clawcloud-org')?.value
      if (currentCookie !== firstSegment) {
        supabaseResponse.cookies.set('clawcloud-org', firstSegment, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          httpOnly: false,
          sameSite: 'lax',
        })
      }
    }
  }

  return supabaseResponse
}
