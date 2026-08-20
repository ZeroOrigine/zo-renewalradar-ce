// CANONICAL email link handler: verifies token_hash links from Supabase email templates.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// rate-limit-exempt: GET token verification; tokens are single-use and validated by Supabase Auth.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next')
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (token_hash && type) {
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
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const target = type === 'recovery' ? '/reset-password' : next
      return NextResponse.redirect(`${siteUrl}${target}`)
    }
  }

  // #1057: recovery links carry the session in the URL FRAGMENT, which this
  // server route can never see but browsers re-attach across the redirect.
  // Forward recovery traffic to the reset page; the root-layout fragment
  // bridge consumes the hash there.
  const zoRecover = new URL(request.url)
  if (zoRecover.searchParams.get('type') === 'recovery' || (zoRecover.searchParams.get('next') || '').includes('reset-password')) {
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }
  return NextResponse.redirect(
    `${siteUrl}/login?error=${encodeURIComponent(
      'That confirmation link expired or was already used. Sign in, or request a fresh link.'
    )}`
  )
}
