// CANONICAL billing portal route: billing-client.tsx calls this for 'Manage billing'.
// The central payments proxy owns Stripe; this product holds no Stripe key. The
// portal endpoint defaults to PAYMENTS_URL + '/portal' and can be overridden with
// PAYMENTS_PORTAL_URL if the central contract differs.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { rateLimitCheck, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = 'renewalradarce'

export async function POST(request: Request) {
  const verdict = await rateLimitCheck(`${PRODUCT_SLUG}_billing`, clientIp(request), 20, 1000)
  if (!verdict.allowed) {
    return NextResponse.json(
      { data: null, error: 'Too many requests for today. The counter resets tomorrow.' },
      { status: 429 }
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
    return NextResponse.json({ data: null, error: 'Please sign in to manage billing.' }, { status: 401 })
  }

  const { data: sub, error: subError } = await supabase
    .from('renewalradarce_subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (subError) {
    return NextResponse.json(
      { data: null, error: 'We could not load your billing profile. Please try again.' },
      { status: 500 }
    )
  }
  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { data: null, error: 'No billing profile yet. Upgrade to a paid plan first.' },
      { status: 404 }
    )
  }

  const paymentsUrl = process.env.PAYMENTS_URL
  const proxyToken = process.env.PAYMENTS_PROXY_TOKEN
  if (!paymentsUrl || !proxyToken) {
    return NextResponse.json(
      { data: null, error: 'The billing portal is warming up and is not ready yet. Please try again soon.' },
      { status: 503 }
    )
  }
  const portalEndpoint =
    process.env.PAYMENTS_PORTAL_URL || `${paymentsUrl.replace(/\/$/, '')}/portal`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  let portalUrl: string | null = null
  try {
    const res = await fetch(portalEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proxyToken}`,
      },
      cache: 'no-store',
      body: JSON.stringify({
        product_slug: PRODUCT_SLUG,
        user_id: user.id,
        user_email: user.email ?? null,
        stripe_customer_id: sub.stripe_customer_id,
        return_url: `${siteUrl}/billing?billing=updated`,
      }),
    })
    if (res.ok) {
      const payload = (await res.json().catch(() => null)) as { url?: string } | null
      if (payload && typeof payload.url === 'string') portalUrl = payload.url
    }
  } catch {
    portalUrl = null
  }

  if (!portalUrl) {
    return NextResponse.json(
      { data: null, error: 'We could not open the billing portal just now. Please try again in a minute.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ data: { url: portalUrl }, error: null })
}
