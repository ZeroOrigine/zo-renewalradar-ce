// CANONICAL middleware for RenewalRadar CE: refreshes the Supabase session and guards routes.
// CORS posture: no Access-Control-Allow-Origin header is ever set, so browsers enforce
// same-origin for every /api route. That deny-by-default stance is intentional; the
// explicit security headers below make the posture auditable.
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// Machine or pre-auth endpoints that manage their own access story.
const API_PUBLIC = [
  '/api/webhooks',        // central payments service, verified out-of-band
  '/api/billing/confirm', // browser redirect target; redirects to /login itself
  '/api/zo',              // Purpose Beacon collector; fires before a session exists
  '/api/state-rules',     // public catalog (anon SELECT policy in RLS)
  '/api/plans',           // public catalog (anon SELECT policy in RLS)
  '/api/auth/signout',    // idempotent; clears only the caller's own cookies
  '/api/cron',            // scheduler-only; each route self-guards via CRON_SECRET Bearer check
]

const PROTECTED_PAGES = ['/dashboard', '/licenses', '/rules', '/settings', '/billing']

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return res
}

export async function middleware(request: NextRequest) {
  // updateSession() validates the JWT via supabase.auth.getUser(); never trust getSession() here.
  const { response, user } = await updateSession(request)

  const path = request.nextUrl.pathname

  if (path.startsWith('/api')) {
    if (API_PUBLIC.some((p) => path.startsWith(p))) return withSecurityHeaders(response)
    if (!user) {
      return withSecurityHeaders(
        NextResponse.json(
          { data: null, error: 'Please sign in to use this.', code: 'unauthorized' },
          { status: 401 }
        )
      )
    }
    return withSecurityHeaders(response)
  }

  const isProtectedPage = PROTECTED_PAGES.some((p) => path === p || path.startsWith(`${p}/`))
  if (isProtectedPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('redirect', path)
    return withSecurityHeaders(NextResponse.redirect(url))
  }

  if ((path === '/login' || path === '/signup') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return withSecurityHeaders(NextResponse.redirect(url))
  }

  return withSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/licenses/:path*',
    '/rules/:path*',
    '/settings/:path*',
    '/billing/:path*',
    '/api/:path*',
    '/login',
    '/signup',
  ],
}
