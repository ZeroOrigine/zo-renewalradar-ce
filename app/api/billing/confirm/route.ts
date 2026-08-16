// CANONICAL checkout return leg: verifies the paid state written by the central webhook,
// emits the payment metric exactly once, then lands the user on /billing where the
// success banner and the (deduped) client beacon live.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ENTITLED_STATUSES = ['active', 'trialing']

// rate-limit-exempt: browser GET redirect target from checkout; the payment metric below only
// fires when the central webhook has written a paid subscription, and a ledger row keeps it exactly-once.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // cookie writes are best-effort in this context
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?redirect=${encodeURIComponent('/billing')}`)
  }

  try {
    // Give the central webhook a moment to land, then trust only what it wrote to our tables.
    let paidSub: { status: string; stripe_subscription_id: string | null } | null = null
    const delays = [1000, 1500, 2000, 2500, 3000]
    for (let attempt = 0; attempt < delays.length; attempt++) {
      const { data } = await supabase
        .from('renewalradarce_subscriptions')
        .select('status, stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data && ENTITLED_STATUSES.includes(data.status)) {
        paidSub = data
        break
      }
      if (attempt < delays.length - 1) await new Promise((r) => setTimeout(r, delays[attempt]))
    }

    if (paidSub) {
      const sessionId = searchParams.get('session_id')
      const dedupeKey = `metric_payment_${sessionId || paidSub.stripe_subscription_id || user.id}`
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      const { error: ledgerError } = await admin.from('renewalradarce_stripe_events').insert({
        event_id: dedupeKey,
        event_type: 'zo_metric_payment',
        processed_at: new Date().toISOString(),
      })
      if (!ledgerError) {
        await admin
          .from('zo_product_metrics')
          .insert({ product_slug: 'renewalradarce', event: 'payment', path: '/api/billing/confirm' })
      }
    }
  } catch {
    // fail-soft: metric hiccups never block the user's return trip
  }

  return NextResponse.redirect(`${siteUrl}/billing?checkout=success`)
}
