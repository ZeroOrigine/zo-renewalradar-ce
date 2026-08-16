// CANONICAL dashboard overview: renewal radar, stats, urgent deadlines, upcoming alerts.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { listLicenses } from '@/lib/db/licenses';
import { listAlerts } from '@/lib/db/alerts';
import { getEntitlement } from '@/lib/db/plans';
import { ensureProfile } from '@/lib/db/profiles';
import { listStateRules } from '@/lib/db/state-rules';
import { countdownLabel, countdownTone, formatDate, formatHours, professionLabel } from '@/lib/core/format';
import type { LicenseWithProgress } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function LicenseRow({ license }: { license: LicenseWithProgress }) {
  const p = license.progress;
  const pct = p.percent_complete ?? 0;
  return (
    <Link
      href={`/licenses/${license.id}`}
      className="card pop-in flex flex-col gap-3 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-3 sm:w-60">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            license.profession === 'real_estate' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {license.state_code}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {license.label || `${license.state_code} ${professionLabel(license.profession)}`}
          </p>
          <p className="text-xs text-slate-500">
            {professionLabel(license.profession)} · renews {formatDate(license.renewal_deadline)}
          </p>
        </div>
      </div>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="bar-fill h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {p.hours_required !== null
            ? `${formatHours(p.hours_completed)} of ${formatHours(p.hours_required)} hrs logged`
            : `${formatHours(p.hours_completed)} hrs logged, no hour target set`}
        </p>
      </div>
      <span className={`inline-flex shrink-0 items-center self-start rounded-full border px-3 py-1 text-xs font-semibold sm:self-center ${countdownTone(p.days_until_renewal)}`}>
        {countdownLabel(p.days_until_renewal)}
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');

  const [profile, licensesResult, alertsResult, entitlement] = await Promise.all([
    ensureProfile(supabase, user.id, user.email ?? null),
    listLicenses(supabase, user.id, { from: 0, to: 49 }),
    listAlerts(supabase, user.id, { from: 0, to: 4, status: 'pending' }),
    getEntitlement(supabase, user.id),
  ]);
  const licenses = licensesResult.licenses;
  const firstName = profile.full_name.trim().split(' ')[0] || null;

  if (licenses.length === 0) {
    const { rules, total } = await listStateRules(supabase, { from: 0, to: 7 });
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card pop-in p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Your renewal radar</p>
          <h1 className="mt-2 text-2xl">{firstName ? `Welcome, ${firstName}.` : 'Welcome.'} Your radar is empty.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
            Add a license and RenewalRadar CE loads its state rule, arms countdown alerts at 90, 60, 30, 14, 7, and 1 days
            out, and tracks every CE hour you log. It takes about 30 seconds.
          </p>
          <Link href="/licenses" className="btn-primary mt-6">Add your first license</Link>
        </div>
        <div className="card mt-6 p-6">
          <h2 className="text-sm font-bold text-slate-900">{total} state rules already loaded</h2>
          <p className="mt-1 text-xs text-slate-500">Each links to its official source. Works with any course provider.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {rules.map((r) => (
              <span key={r.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {r.state_code} {professionLabel(r.profession)}: {formatHours(r.total_hours_required)} hrs
              </span>
            ))}
          </div>
          <Link href="/rules" className="mt-4 inline-block text-sm font-semibold text-emerald-700 underline">
            Browse all state rules
          </Link>
        </div>
      </div>
    );
  }

  const totalHours = licenses.reduce((sum, l) => sum + l.progress.hours_completed, 0);
  const next = licenses[0];
  const attention = licenses.filter(
    (l) => l.status === 'active' && l.progress.days_until_renewal <= 60 && (l.progress.hours_remaining ?? 0) > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
          <p className="mt-1 text-sm text-slate-500">Here is your renewal radar across every state you hold.</p>
        </div>
        <Link href="/licenses" className="btn-primary self-start sm:self-auto">Add license</Link>
      </div>

      {attention.length > 0 && (
        <div className="pop-in rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {attention.length === 1 ? 'One license needs attention' : `${attention.length} licenses need attention`}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {attention
              .map((l) => `${l.state_code}: ${formatHours(l.progress.hours_remaining ?? 0)} hrs due in ${l.progress.days_until_renewal} days`)
              .join(' · ')}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Licenses tracked"
          value={String(licenses.length)}
          sub={
            entitlement.max_licenses !== null
              ? `${licenses.length} of ${entitlement.max_licenses} on ${entitlement.plan_name}`
              : `${entitlement.plan_name} plan, unlimited`
          }
        />
        <StatCard label="Hours logged" value={formatHours(totalHours)} sub="across current periods" />
        <StatCard
          label="Next renewal"
          value={countdownLabel(next.progress.days_until_renewal)}
          sub={`${next.state_code} on ${formatDate(next.renewal_deadline)}`}
        />
        <StatCard label="Alerts armed" value={String(alertsResult.total)} sub="pending countdown alerts" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your renewal radar</h2>
          <Link href="/rules" className="text-sm font-semibold text-emerald-700 underline">State rules</Link>
        </div>
        <div className="space-y-3">
          {licenses.map((license) => (
            <LicenseRow key={license.id} license={license} />
          ))}
        </div>
      </section>

      {alertsResult.alerts.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Next heads ups</h2>
          <ul className="mt-3 space-y-2">
            {alertsResult.alerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <span>
                  {a.days_before}-day notice · {a.license?.label || a.license?.state_code || 'License'}
                </span>
                <span className="text-xs text-slate-500">{formatDate(a.trigger_on)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Manage alerts on each license page.</p>
        </section>
      )}
    </div>
  );
}
