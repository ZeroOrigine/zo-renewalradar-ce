// CANONICAL checkout route: the central payments proxy owns Stripe; this product holds no Stripe key.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { rateLimitCheck, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const PRODUCT_SLUG = 'renewalradarce'
const ENTITLED_STATUSES = ['active', 'trialing']

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
    return NextResponse.json({ data: null, error: 'Please sign in to upgrade.' }, { status: 401 })
  }

  let body: { plan_code?: unknown; price_id?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // empty or invalid JSON body is handled below
  }
  const planCode =
    typeof body.plan_code === 'string'
      ? body.plan_code
      : typeof body.price_id === 'string'
        ? body.price_id
        : ''
  if (!planCode) {
    return NextResponse.json(
      { data: null, error: 'Pick a plan first, then try again.' },
      { status: 400 }
    )
  }

  // Prices live in the database, never in env vars.
  const { data: plan, error: planError } = await supabase
    .from('renewalradarce_plans')
    .select('id, code, name, price_cents, currency, billing_interval')
    .eq('code', planCode)
    .eq('is_active', true)
    .maybeSingle()
  if (planError || !plan) {
    return NextResponse.json(
      { data: null, error: 'That plan is not available right now. Refresh the page and pick again.' },
      { status: 400 }
    )
  }
  if (plan.price_cents === 0 || !plan.billing_interval) {
    return NextResponse.json(
      { data: null, error: 'The Free plan needs no checkout. You already have it.' },
      { status: 400 }
    )
  }

  const { data: sub } = await supabase
    .from('renewalradarce_subscriptions')
    .select('plan_id, status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (sub && sub.plan_id === plan.id && ENTITLED_STATUSES.includes(sub.status)) {
    return NextResponse.json(
      { data: null, error: 'You are already on this plan. Nothing to buy.' },
      { status: 409 }
    )
  }

  const paymentsUrl = process.env.PAYMENTS_URL
  const proxyToken = process.env.PAYMENTS_PROXY_TOKEN
  if (!paymentsUrl || !proxyToken) {
    return NextResponse.json(
      { data: null, error: 'Checkout is warming up and is not ready yet. Please try again soon.' },
      { status: 503 }
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  let checkoutUrl: string | null = null
  try {
    const res = await fetch(paymentsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proxyToken}`,
      },
      cache: 'no-store',
      body: JSON.stringify({
        product_slug: PRODUCT_SLUG,
        price_id: plan.code,
        user_id: user.id,
        user_email: user.email ?? null,
        plan: {
          code: plan.code,
          name: plan.name,
          amount_cents: plan.price_cents,
          currency: plan.currency,
          interval: plan.billing_interval,
        },
        success_url: `${siteUrl}/api/billing/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/billing?checkout=cancel`,
        metadata: { product: PRODUCT_SLUG, user_id: user.id, plan_code: plan.code },
      }),
    })
    if (res.ok) {
      const payload = (await res.json().catch(() => null)) as { url?: string } | null
      if (payload && typeof payload.url === 'string') checkoutUrl = payload.url
    }
  } catch {
    checkoutUrl = null
  }

  if (!checkoutUrl) {
    return NextResponse.json(
      {
        data: null,
        error: 'Checkout could not start just now. Nothing was charged. Please try again in a minute.',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ data: { url: checkoutUrl }, error: null })
}
