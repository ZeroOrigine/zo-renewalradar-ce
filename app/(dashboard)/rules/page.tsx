'use client';

// CANONICAL state rules explorer: cross-state CE rule database with official sources.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/core/api';
import { formatDate, formatHours, formatPeriod, prettyCategory, professionLabel, renewalBasisLabel } from '@/lib/core/format';
import type { Profession, StateRule } from '@/lib/db/types';

interface RulesPayload { state_rules: StateRule[]; total: number; }

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<StateRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profession, setProfession] = useState<'all' | Profession>('all');
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const limit = 100;
      const all: StateRule[] = [];
      let offset = 0;
      let total = Infinity;
      while (offset < total) {
        const res = await apiGet<RulesPayload>(`/api/state-rules?limit=${limit}&offset=${offset}`);
        if (res.error || !res.data) {
          if (!cancelled) setError(res.error);
          break;
        }
        all.push(...res.data.state_rules);
        total = res.data.total;
        if (res.data.state_rules.length < limit) break;
        offset += limit;
      }
      if (!cancelled) {
        setRules(all);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stateCodes = Array.from(new Set(rules.map((r) => r.state_code))).sort();
  const filtered = rules.filter(
    (r) => (profession === 'all' || r.profession === profession) && (!stateFilter || r.state_code === stateFilter),
  );

  function trackRule(rule: StateRule) {
    try {
      sessionStorage.setItem('rrce_prefill', JSON.stringify({ state_code: rule.state_code, profession: rule.profession }));
    } catch {
      // Prefill is best effort.
    }
    router.push('/licenses');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">State rules</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          {rules.length > 0 ? `${rules.length} rules on file. ` : ''}Each rule links to its official source with a last
          verified date. Rules change, so confirm with your state board before you rely on a date. Course provider does
          not matter here, hours from any provider count.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-lg border border-slate-300 bg-white p-1" role="group" aria-label="Filter by profession">
          {(['all', 'real_estate', 'insurance'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProfession(p)}
              aria-pressed={profession === p}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                profession === p ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p === 'all' ? 'All' : professionLabel(p)}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="rules-state" className="sr-only">Filter by state</label>
          <select id="rules-state" className="input sm:w-48" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">Every state on file</option>
            {stateCodes.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="text-base font-bold">No rules match that filter</h2>
          <p className="mt-2 text-sm text-slate-600">Try a different state or profession. More rules are added over time.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((rule) => (
            <article key={rule.id} className="card pop-in flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      rule.profession === 'real_estate' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {rule.state_code}
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {rule.state_code} {professionLabel(rule.profession)}
                      {rule.license_class !== 'all' ? ` (${prettyCategory(rule.license_class)})` : ''}
                    </h2>
                    <p className="text-xs text-slate-500">{renewalBasisLabel(rule.renewal_basis, rule.fixed_renewal_month, rule.fixed_renewal_day)}</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-slate-900">
                {formatHours(rule.total_hours_required)} hrs <span className="text-sm font-medium text-slate-500">{formatPeriod(rule.renewal_period_months)}</span>
              </p>
              {rule.category_requirements.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rule.category_requirements.map((c) => (
                    <span key={c.category} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {prettyCategory(c.category)}: {formatHours(c.hours)} hrs
                    </span>
                  ))}
                </div>
              )}
              {rule.notes && <p className="mt-3 flex-1 text-xs text-slate-500">{rule.notes}</p>}
              <div className="mt-4 flex items-center justify-between gap-3">
                <a href={rule.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-700 underline">
                  Source, verified {formatDate(rule.last_verified_on)}
                </a>
                <button onClick={() => trackRule(rule)} className="btn-secondary px-3 py-1.5 text-xs">Track this license</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
