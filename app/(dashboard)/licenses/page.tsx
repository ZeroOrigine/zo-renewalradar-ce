'use client';

// CANONICAL licenses page: track licenses with an instant state rule preview on add.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { zoEvent } from '@/components/ZoBeacon';
import { useToast } from '@/components/toast';
import { apiGet, apiSend } from '@/lib/core/api';
import {
  US_STATES,
  countdownLabel,
  countdownTone,
  formatDate,
  formatHours,
  formatPeriod,
  nextFixedDate,
  prettyCategory,
  professionLabel,
} from '@/lib/core/format';
import type { Entitlement, LicenseWithProgress, Profession, StateRule } from '@/lib/db/types';

// #100: a descendant reads URL search params (useSearchParams); opt this
// route out of static generation so `next build` does not CSR-bail.
export const dynamic = 'force-dynamic';

interface MePayload { entitlement: Entitlement; license_count: number; }
interface ListPayload { licenses: LicenseWithProgress[]; pagination?: { total?: number; limit?: number; offset?: number } | null; }
interface RulesPayload { state_rules: StateRule[]; }

interface FormState {
  state_code: string;
  profession: Profession;
  license_class: string;
  label: string;
  license_number: string;
  renewal_deadline: string;
  current_period_start: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  state_code: '',
  profession: 'real_estate',
  license_class: 'all',
  label: '',
  license_number: '',
  renewal_deadline: '',
  current_period_start: '',
  notes: '',
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const focusable = node.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? node).focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-y-auto outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div className="relative mx-auto my-8 w-full max-w-lg px-4">
        <div className="pop-in card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function LicensesPage() {
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<LicenseWithProgress[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [preview, setPreview] = useState<StateRule | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAllLicenses(): Promise<{ licenses: LicenseWithProgress[]; error: string | null }> {
      // QA-003: loop pages using pagination.total so Pro users with >100 licenses see every row.
      const PAGE_SIZE = 100;
      const MAX_PAGES = 100;
      const all: LicenseWithProgress[] = [];
      let error: string | null = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await apiGet<ListPayload>(`/api/licenses?limit=${PAGE_SIZE}&page=${page + 1}`);
        if (res.error || !res.data) {
          error = res.error ?? 'We could not load your licenses.';
          break;
        }
        const rows = res.data.licenses ?? [];
        all.push(...rows);
        const total = res.data.pagination?.total;
        if (rows.length === 0 || rows.length < PAGE_SIZE) break;
        if (typeof total === 'number' && all.length >= total) break;
      }
      const seen = new Set<string>();
      const deduped: LicenseWithProgress[] = [];
      for (const l of all) {
        if (!seen.has(l.id)) {
          seen.add(l.id);
          deduped.push(l);
        }
      }
      return { licenses: deduped, error };
    }
    async function load() {
      const [licensesRes, meRes] = await Promise.all([
        loadAllLicenses(),
        apiGet<MePayload>('/api/me'),
      ]);
      if (cancelled) return;
      setLicenses(licensesRes.licenses);
      if (licensesRes.error) setLoadError(licensesRes.error);
      if (meRes.data) setEntitlement(meRes.data.entitlement);
      setLoading(false);
    }
    load();
    try {
      const raw = sessionStorage.getItem('rrce_prefill');
      if (raw) {
        sessionStorage.removeItem('rrce_prefill');
        const p = JSON.parse(raw) as { state_code?: string; profession?: Profession };
        setForm((f) => ({
          ...f,
          state_code: p.state_code ?? f.state_code,
          profession: p.profession ?? f.profession,
          license_class: p.profession === 'insurance' ? 'producer' : 'all',
        }));
        setModalOpen(true);
      }
    } catch {
      // Prefill is best effort.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalOpen || !form.state_code) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    apiGet<RulesPayload>(`/api/state-rules?state=${form.state_code}&profession=${form.profession}&limit=50`).then((res) => {
      if (cancelled) return;
      const rules = res.data?.state_rules ?? [];
      const match =
        rules.find((r) => r.license_class === form.license_class) ??
        rules.find((r) => r.license_class === 'all') ??
        rules[0] ??
        null;
      setPreview(match);
      if (match) {
        setForm((f) => (f.license_class === match.license_class ? f : { ...f, license_class: match.license_class }));
      }
      setPreviewLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, form.state_code, form.profession]);

  function openModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setLimitHit(false);
    setModalOpen(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.state_code || !form.renewal_deadline) {
      setFormError('Pick a state and a renewal deadline.');
      return;
    }
    setSaving(true);
    setFormError(null);
    setLimitHit(false);
    const res = await apiSend<LicenseWithProgress>('/api/licenses', 'POST', {
      state_code: form.state_code,
      profession: form.profession,
      license_class: form.license_class.trim() || 'all',
      license_number: form.license_number.trim(),
      label: form.label.trim(),
      status: 'active',
      renewal_deadline: form.renewal_deadline,
      current_period_start: form.current_period_start || null,
      notes: form.notes.trim(),
    });
    setSaving(false);
    if (res.error || !res.data) {
      if (res.code === 'license_limit_reached') {
        setLimitHit(true);
        return;
      }
      setFormError(res.error ?? 'We could not save that license. Please try again.');
      return;
    }
    const created = res.data;
    const wasFirst = licenses.length === 0;
    setLicenses((prev) => [...prev, created].sort((a, b) => a.renewal_deadline.localeCompare(b.renewal_deadline)));
    setModalOpen(false);
    setForm(EMPTY_FORM);
    if (wasFirst) zoEvent('activation');
    toast('success', wasFirst ? 'Your radar is live. First license tracked.' : `Tracking ${created.state_code} now. Countdown armed.`);
  }

  const atLimit = entitlement?.max_licenses !== null && entitlement !== null && licenses.length >= (entitlement.max_licenses ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl">Licenses</h1>
          <p className="mt-1 text-sm text-slate-500">Every license gets its own countdown, rule, and hour tracker.</p>
        </div>
        <button onClick={openModal} className="btn-primary self-start sm:self-auto">Add license</button>
      </div>

      {entitlement && entitlement.max_licenses !== null && (
        <p className="text-xs text-slate-500">
          {licenses.length} of {entitlement.max_licenses} licenses on the {entitlement.plan_name} plan.
          {atLimit && (
            <>
              {' '}Need more?{' '}
              <Link href="/billing" className="font-semibold text-emerald-700 underline">Go Pro for unlimited licenses</Link>.
            </>
          )}
        </p>
      )}

      {loadError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-36" />
          ))}
        </div>
      ) : licenses.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="text-lg font-bold text-slate-900">Nothing on the radar yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Add a license and we load its state rule, arm six countdown alerts, and start tracking hours. Any course
            provider counts.
          </p>
          <button onClick={openModal} className="btn-primary mt-5">Add your first license</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {licenses.map((license) => {
            const p = license.progress;
            const pct = p.percent_complete ?? 0;
            return (
              <Link key={license.id} href={`/licenses/${license.id}`} className="card pop-in flex flex-col gap-3 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        license.profession === 'real_estate' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {license.state_code}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {license.label || `${license.state_code} ${professionLabel(license.profession)}`}
                      </p>
                      <p className="text-xs text-slate-500">{professionLabel(license.profession)}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${countdownTone(p.days_until_renewal)}`}>
                    {countdownLabel(p.days_until_renewal)}
                  </span>
                </div>
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="bar-fill h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {p.hours_required !== null
                      ? `${formatHours(p.hours_completed)} of ${formatHours(p.hours_required)} hrs · renews ${formatDate(license.renewal_deadline)}`
                      : `${formatHours(p.hours_completed)} hrs logged · renews ${formatDate(license.renewal_deadline)}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal title="Add a license" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lic-state" className="label">State</label>
                <select
                  id="lic-state"
                  className="input"
                  value={form.state_code}
                  onChange={(e) => setForm((f) => ({ ...f, state_code: e.target.value }))}
                  required
                >
                  <option value="">Pick a state</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lic-prof" className="label">Profession</label>
                <select
                  id="lic-prof"
                  className="input"
                  value={form.profession}
                  onChange={(e) => {
                    const v = e.target.value as Profession;
                    setForm((f) => ({ ...f, profession: v, license_class: v === 'insurance' ? 'producer' : 'all' }));
                  }}
                >
                  <option value="real_estate">Real estate</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
            </div>

            {previewLoading && <div className="skeleton h-24" />}
            {!previewLoading && preview && (
              <div className="pop-in rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">
                  {preview.state_code} requires {formatHours(preview.total_hours_required)} hours {formatPeriod(preview.renewal_period_months)}
                </p>
                {preview.category_requirements.length > 0 && (
                  <p className="mt-1 text-xs text-emerald-800">
                    Including {preview.category_requirements.map((c) => `${formatHours(c.hours)} hrs ${prettyCategory(c.category)}`).join(', ')}
                  </p>
                )}
                {preview.renewal_basis === 'fixed_date' && preview.fixed_renewal_month && preview.fixed_renewal_day && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, renewal_deadline: nextFixedDate(preview.fixed_renewal_month!, preview.fixed_renewal_day!) }))
                    }
                    className="mt-2 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Use next fixed date: {formatDate(nextFixedDate(preview.fixed_renewal_month, preview.fixed_renewal_day))}
                  </button>
                )}
                <a href={preview.source_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-semibold text-emerald-700 underline">
                  Official source, verified {formatDate(preview.last_verified_on)}
                </a>
              </div>
            )}
            {!previewLoading && !preview && form.state_code && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                No rule on file yet for this combination. Your countdown still works, and you can set an hour target on the
                license page.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lic-deadline" className="label">Renewal deadline</label>
                <input
                  id="lic-deadline"
                  type="date"
                  className="input"
                  value={form.renewal_deadline}
                  onChange={(e) => setForm((f) => ({ ...f, renewal_deadline: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="lic-period" className="label">Period start <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  id="lic-period"
                  type="date"
                  className="input"
                  value={form.current_period_start}
                  onChange={(e) => setForm((f) => ({ ...f, current_period_start: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="lic-label" className="label">Label <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  id="lic-label"
                  className="input"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="TX Broker"
                  maxLength={120}
                />
              </div>
              <div>
                <label htmlFor="lic-number" className="label">License number <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  id="lic-number"
                  className="input"
                  value={form.license_number}
                  onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div>
                <label htmlFor="lic-class" className="label">License class</label>
                <input
                  id="lic-class"
                  className="input"
                  value={form.license_class}
                  onChange={(e) => setForm((f) => ({ ...f, license_class: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div>
                <label htmlFor="lic-notes" className="label">Notes <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  id="lic-notes"
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  maxLength={2000}
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-700">{formError}</p>}
            {limitHit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Your {entitlement?.plan_name ?? 'Free'} plan tracks up to {entitlement?.max_licenses ?? 2} licenses.{' '}
                <Link href="/billing" className="font-semibold underline">Upgrade to Pro</Link> to track every license you hold.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving' : 'Start tracking'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
