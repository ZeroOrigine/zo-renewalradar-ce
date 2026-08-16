// CANONICAL billing status route: current plan, subscription, and license usage for the signed-in user.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

const ENTITLED_STATUSES = ['active', 'trialing']

// rate-limit-exempt: read-only GET, session-scoped, no writes and no external spend.
export async function GET() {
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
    return NextResponse.json({ data: null, error: 'Please sign in to see billing.' }, { status: 401 })
  }

  const [plansRes, subRes, licensesRes] = await Promise.all([
    supabase
      .from('renewalradarce_plans')
      .select('id, code, name, description, price_cents, currency, billing_interval, max_licenses, features, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('renewalradarce_subscriptions')
      .select('plan_id, status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('renewalradarce_licenses').select('id', { count: 'exact', head: true }),
  ])

  const plans = plansRes.data ?? []
  const subscription = subRes.data ?? null
  const licensesUsed = licensesRes.count ?? 0

  const freePlan = plans.find((p) => p.code === 'free') ?? null
  const paidPlan =
    subscription && ENTITLED_STATUSES.includes(subscription.status)
      ? plans.find((p) => p.id === subscription.plan_id) ?? null
      : null
  const currentPlan = paidPlan ?? freePlan
  const licenseLimit = currentPlan?.max_licenses ?? null

  return NextResponse.json({
    data: {
      plan: currentPlan,
      plans,
      subscription,
      usage: {
        licenses_used: licensesUsed,
        license_limit: licenseLimit,
        can_add_license: licenseLimit === null || licensesUsed < licenseLimit,
      },
    },
    error: null,
  })
}
