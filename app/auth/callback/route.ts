// CANONICAL OAuth and PKCE callback: exchanges the code, lands the user, counts new Google signups.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function safeNext(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/dashboard'
}

// rate-limit-exempt: GET code exchange; codes are single-use and validated by Supabase Auth.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent('That link is missing its sign-in code. Please try again.')}`
    )
  }

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data?.user) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(
        'That sign-in link did not work. It may have expired, or it was opened in a different browser. Please try again.'
      )}`
    )
  }

  // Server-side signup metric for first-time Google users; email signups fire zoEvent in the signup form.
  try {
    const user = data.user
    const provider = user.app_metadata?.provider
    const createdRecently =
      !!user.created_at && Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000
    if (provider === 'google' && createdRecently) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      // Ledger row makes this metric exactly-once per user.
      const { error: ledgerError } = await admin.from('renewalradarce_stripe_events').insert({
        event_id: `metric_signup_${user.id}`,
        event_type: 'zo_metric_signup',
        processed_at: new Date().toISOString(),
      })
      if (!ledgerError) {
        await admin
          .from('zo_product_metrics')
          .insert({ product_slug: 'renewalradarce', event: 'signup', path: '/auth/callback' })
      }
    }
  } catch {
    // fail-soft: metrics never block a sign-in
  }

  return NextResponse.redirect(`${siteUrl}${next}`)
}
