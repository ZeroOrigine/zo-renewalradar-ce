// CANONICAL signout route: clears the caller's own session cookies, then lands on /login.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

// rate-limit-exempt: session-scoped idempotent signout; it only clears the caller's own cookies.
export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await supabase.auth.signOut()
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return NextResponse.redirect(`${siteUrl}/login`, { status: 303 })
}
