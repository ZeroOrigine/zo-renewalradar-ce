'use client';

// CANONICAL billing client: plans from the database, checkout, portal, payment beacon.
import { useEffect, useState } from 'react';
import { zoEvent } from '@/components/ZoBeacon';
import { useToast } from '@/components/toast';
import { apiGet, apiSend } from '@/lib/core/api';
import { formatDate, formatMoney } from '@/lib/core/format';
import type { Entitlement, Plan, Profile } from '@/lib/db/types';

interface MePayload { profile: Profile; entitlement: Entitlement; license_count: number; }
interface PlansPayload { plans: Plan[]; }
interface CheckoutPayload { url?: string; checkout_url?: string; session_url?: string; }

export default function BillingClient({ checkout, billing }: { checkout: 'success' | 'cancel' | null; billing: string | null }) {
  const { toast } = useToast();
  const [me, setMe] = useState<MePayload | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    if (checkout !== 'success') return;
    try {
      // sessionStorage guard: the beacon fires once per tab, never on remount or refresh.
      if (!sessionStorage.getItem('rrce_payment_beacon')) {
        sessionStorage.setItem('rrce_payment_beacon', '1');
        zoEvent('payment');
      }
    } catch {
      // Without storage we skip rather than risk double counting.
    }
  }, [checkout]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [meRes, plansRes] = await Promise.all([apiGet<MePayload>('/api/me'), apiGet<PlansPayload>('/api/plans')]);
      if (cancelled) return;
      if (meRes.data) setMe(meRes.data);
      if (plansRes.data) setPlans(plansRes.data.plans);
      if (meRes.error) setLoadError(meRes.error);
      else if (plansRes.error) setLoadError(plansRes.error);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout(plan: Plan) {
    setBusyPlan(plan.code);
    const res = await apiSend<CheckoutPayload>('/api/checkout', 'POST', { plan_code: plan.code, plan_id: plan.id });
    const url = res.data?.url ?? res.data?.checkout_url ?? res.data?.session_url;
    if (url) {
      window.location.assign(url);
      return;
    }
    setBusyPlan(null);
    toast('error', res.error ?? 'We could not start checkout. Please try again.');
  }

  async function openPortal() {
    setPortalBusy(true);
    const res = await apiSend<CheckoutPayload>('/api/billing/portal', 'POST', {});
    const url = res.data?.url ?? res.data?.checkout_url ?? res.data?.session_url;
    if (url) {
      window.location.assign(url);
      return;
    }
    setPortalBusy(false);
    toast('error', res.error ?? 'We could not open the billing portal. Please try again.');
  }

  const entitlement = me?.entitlement ?? null;
  const hasPaidSub =
    entitlement?.subscription_status === 'active' ||
    entitlement?.subscription_status === 'trialing' ||
    entitlement?.subscription_status === 'past_due';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">Plans, payments, and what your account includes.</p>
      </div>

      {checkout === 'success' && (
        <div className="pop-in rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Payment received. Thank you.</p>
          <p className="mt-1 text-xs">Your plan updates within a minute of payment. Refresh if you do not see it yet.</p>
        </div>
      )}
      {checkout === 'cancel' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          Checkout closed. No charge was made and your plan is unchanged.
        </div>
      )}
      {billing && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">Billing settings updated.</div>
      )}

      {loadError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-72" />
          ))}
        </div>
      ) : (
        <>
          {me && entitlement && (
            <section className="card p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold">Current plan: {entitlement.plan_name}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {me.license_count} {me.license_count === 1 ? 'license' : 'licenses'} tracked
                    {entitlement.max_licenses !== null ? ` of ${entitlement.max_licenses} included` : ', unlimited included'}
                  </p>
                  {hasPaidSub && entitlement.current_period_end && (
                    <p className="mt-1 text-xs text-slate-500">
                      {entitlement.cancel_at_period_end
                        ? `Ends ${formatDate(entitlement.current_period_end.slice(0, 10))}`
                        : `Renews ${formatDate(entitlement.current_period_end.slice(0, 10))}`}
                    </p>
                  )}
                </div>
                {hasPaidSub && (
                  <button onClick={openPortal} disabled={portalBusy} className="btn-secondary self-start">
                    {portalBusy ? 'Opening portal' : 'Manage billing'}
                  </button>
                )}
              </div>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = entitlement?.plan_code === plan.code;
              const isPaid = plan.price_cents > 0;
              return (
                <div key={plan.id} className={`card flex flex-col p-6 ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">{plan.name}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Current plan</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                  <p className="mt-4 font-display text-3xl font-bold text-slate-900">
                    {plan.price_cents === 0 ? '$0' : formatMoney(plan.price_cents)}
                    {plan.billing_interval && (
                      <span className="text-sm font-medium text-slate-500"> per {plan.billing_interval}</span>
                    )}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-emerald-600" aria-hidden="true">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isPaid && !isCurrent && (
                    <button onClick={() => startCheckout(plan)} disabled={busyPlan !== null} className="btn-primary mt-5">
                      {busyPlan === plan.code ? 'Opening checkout' : `Get ${plan.name}`}
                    </button>
                  )}
                  {isPaid && isCurrent && (
                    <button onClick={openPortal} disabled={portalBusy} className="btn-secondary mt-5">
                      {portalBusy ? 'Opening portal' : 'Manage billing'}
                    </button>
                  )}
                  {!isPaid && <p className="mt-5 text-xs text-slate-500">Included with every account.</p>}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400">
            Payments are processed by Stripe. Paid plans charge when checkout completes and you can cancel from the billing
            portal at any time.
          </p>
        </>
      )}
    </div>
  );
}
