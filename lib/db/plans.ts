// CANONICAL plan catalog and entitlement service for RenewalRadar CE. Prices live in the database.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Entitlement, Plan, SubscriptionStatus } from '@/lib/db/types';

const PLAN_COLUMNS =
  'id, code, name, description, price_cents, currency, billing_interval, max_licenses, features, sort_order';

export async function listActivePlans(
  supabase: SupabaseClient,
  options: { from: number; to: number },
): Promise<{ plans: Plan[]; total: number }> {
  const { data, error, count } = await supabase
    .from('renewalradarce_plans')
    .select(PLAN_COLUMNS, { count: 'exact' })
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .range(options.from, options.to);
  if (error) throw new Error(`listActivePlans: ${error.message}`);
  return { plans: (data ?? []) as Plan[], total: count ?? 0 };
}

// One parallel round trip: subscription and plan catalog resolve together.
export async function getEntitlement(supabase: SupabaseClient, userId: string): Promise<Entitlement> {
  const [subscriptionResult, plansResult] = await Promise.all([
    supabase
      .from('renewalradarce_subscriptions')
      .select('status, plan_id, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('renewalradarce_plans')
      .select('id, code, name, max_licenses')
      .eq('is_active', true),
  ]);
  if (subscriptionResult.error) {
    throw new Error(`getEntitlement subscription: ${subscriptionResult.error.message}`);
  }
  if (plansResult.error) {
    throw new Error(`getEntitlement plans: ${plansResult.error.message}`);
  }

  const subscription = subscriptionResult.data as {
    status: SubscriptionStatus;
    plan_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  const plans = (plansResult.data ?? []) as Array<
    Pick<Plan, 'id' | 'code' | 'name' | 'max_licenses'>
  >;
  const freePlan = plans.find((plan) => plan.code === 'free') ?? null;
  const hasPaidAccess =
    subscription !== null && (subscription.status === 'active' || subscription.status === 'trialing');

  if (hasPaidAccess && subscription) {
    const paidPlan = plans.find((plan) => plan.id === subscription.plan_id) ?? null;
    return {
      plan_code: paidPlan?.code ?? 'pro_monthly',
      plan_name: paidPlan?.name ?? 'Pro',
      max_licenses: paidPlan ? paidPlan.max_licenses : null,
      subscription_status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    };
  }

  return {
    plan_code: freePlan?.code ?? 'free',
    plan_name: freePlan?.name ?? 'Free',
    max_licenses: freePlan ? freePlan.max_licenses : 2,
    subscription_status: subscription?.status ?? null,
    current_period_end: subscription?.current_period_end ?? null,
    cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
  };
}
