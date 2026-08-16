'use client';

// CANONICAL license detail page: countdown, CE progress, course log, alerts.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';
import { apiGet, apiSend } from '@/lib/core/api';
import {
  countdownLabel,
  countdownTone,
  formatDate,
  formatHours,
  formatPeriod,
  prettyCategory,
  professionLabel,
  renewalBasisLabel,
  todayIso,
} from '@/lib/core/format';
import type { Alert, CeEntry, LicenseStatus, LicenseWithProgress } from '@/lib/db/types';

interface DetailPayload {
  license: LicenseWithProgress;
  ce_entries: CeEntry[];
  ce_entry_total: number;
  alerts: Alert[];
  alert_total: number;
}

interface EntryFormState {
  course_name: string;
  provider_name: string;
  category: string;
  custom_category: string;
  hours: string;
  completed_on: string;
  certificate_url: string;
  notes: string;
}

interface LicenseFormState {
  label: string;
  license_number: string;
  status: LicenseStatus;
  renewal_deadline: string;
  current_period_start: string;
  hours_required_override: string;
  notes: string;
}

function emptyEntryForm(): EntryFormState {
  return {
    course_name: '',
    provider_name: '',
    category: 'general',
    custom_category: '',
    hours: '',
    completed_on: todayIso(),
    certificate_url: '',
    notes: '',
  };
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
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

function EntryFields({
  form,
  onChange,
  categories,
  idPrefix,
}: {
  form: EntryFormState;
  onChange: (patch: Partial<EntryFormState>) => void;
  categories: string[];
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-course`} className="label">Course name</label>
        <input
          id={`${idPrefix}-course`}
          className="input"
          value={form.course_name}
          onChange={(e) => onChange({ course_name: e.target.value })}
          placeholder="Fair Housing Essentials"
          maxLength={300}
          required
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-provider`} className="label">Provider <span className="font-normal text-slate-400">(any provider counts)</span></label>
        <input
          id={`${idPrefix}-provider`}
          className="input"
          value={form.provider_name}
          onChange={(e) => onChange({ provider_name: e.target.value })}
          maxLength={200}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-category`} className="label">Category</label>
        <select
          id={`${idPrefix}-category`}
          className="input"
          value={form.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          <option value="general">General</option>
          {categories.map((c) => (
            <option key={c} value={c}>{prettyCategory(c)}</option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </div>
      {form.category === 'custom' && (
        <div>
          <label htmlFor={`${idPrefix}-custom`} className="label">Custom category</label>
          <input
            id={`${idPrefix}-custom`}
            className="input"
            value={form.custom_category}
            onChange={(e) => onChange({ custom_category: e.target.value })}
            maxLength={100}
          />
        </div>
      )}
      <div>
        <label htmlFor={`${idPrefix}-hours`} className="label">Hours</label>
        <input
          id={`${idPrefix}-hours`}
          type="number"
          min="0.25"
          max="100"
          step="0.25"
          className="input"
          value={form.hours}
          onChange={(e) => onChange({ hours: e.target.value })}
          required
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-date`} className="label">Completed on</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          className="input"
          value={form.completed_on}
          onChange={(e) => onChange({ completed_on: e.target.value })}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-cert`} className="label">Certificate link <span className="font-normal text-slate-400">(optional, https only)</span></label>
        <input
          id={`${idPrefix}-cert`}
          type="url"
          className="input"
          value={form.certificate_url}
          onChange={(e) => onChange({ certificate_url: e.target.value })}
          placeholder="https://"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-notes`} className="label">Notes <span className="font-normal text-slate-400">(optional)</span></label>
        <input
          id={`${idPrefix}-notes`}
          className="input"
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          maxLength={2000}
        />
      </div>
    </div>
  );
}

export default function LicenseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [license, setLicense] = useState<LicenseWithProgress | null>(null);
  const [entries, setEntries] = useState<CeEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm());
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [editingEntry, setEditingEntry] = useState<CeEntry | null>(null);
  const [editForm, setEditForm] = useState<EntryFormState>(emptyEntryForm());
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [licenseForm, setLicenseForm] = useState<LicenseFormState | null>(null);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiGet<DetailPayload>(`/api/licenses/${params.id}`);
    if (res.data) {
      setLicense(res.data.license);
      setEntries(res.data.ce_entries);
      setAlerts(res.data.alerts);
      setNotFound(false);
      setLoadError(null);
    } else if (res.status === 404) {
      setNotFound(true);
    } else {
      setLoadError(res.error);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = (license?.state_rule?.category_requirements ?? [])
    .map((c) => c.category)
    .filter((c) => c !== 'general');

  async function handleAddEntry(e: FormEvent) {
    e.preventDefault();
    if (!license) return;
    const hoursNum = Number(entryForm.hours);
    const category = entryForm.category === 'custom' ? entryForm.custom_category.trim() : entryForm.category;
    if (!entryForm.course_name.trim()) {
      setEntryError('What was the course called?');
      return;
    }
    if (!Number.isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 100) {
      setEntryError('Hours must be a number between 0 and 100.');
      return;
    }
    if (!entryForm.completed_on) {
      setEntryError('When did you complete it?');
      return;
    }
    const cert = entryForm.certificate_url.trim();
    if (cert && !cert.startsWith('https://')) {
      setEntryError('Certificate links need to start with https://.');
      return;
    }
    setEntrySaving(true);
    setEntryError(null);
    const res = await apiSend<{ entry: CeEntry; license: LicenseWithProgress | null }>('/api/ce-entries', 'POST', {
      license_id: license.id,
      course_name: entryForm.course_name.trim(),
      provider_name: entryForm.provider_name.trim(),
      category: category || 'general',
      hours: hoursNum,
      completed_on: entryForm.completed_on,
      certificate_url: cert || null,
      notes: entryForm.notes.trim(),
    });
    setEntrySaving(false);
    if (res.error || !res.data) {
      setEntryError(res.error ?? 'We could not save that course. Please try again.');
      return;
    }
    setEntries((prev) => [res.data!.entry, ...prev]);
    if (res.data.license) setLicense(res.data.license);
    setEntryForm((f) => ({ ...f, course_name: '', provider_name: '', hours: '', certificate_url: '', notes: '' }));
    const next = res.data.license?.progress;
    if (next && next.hours_required !== null && next.hours_remaining === 0) {
      toast('success', 'Requirement complete. You are clear for this period.');
    } else if (next && next.hours_remaining !== null) {
      toast('success', `Logged ${formatHours(hoursNum)} hrs. ${formatHours(next.hours_remaining)} to go.`);
    } else {
      toast('success', `Logged ${formatHours(hoursNum)} hrs.`);
    }
  }

  function openEditEntry(entry: CeEntry) {
    const known = entry.category === 'general' || categories.includes(entry.category);
    setEditForm({
      course_name: entry.course_name,
      provider_name: entry.provider_name,
      category: known ? entry.category : 'custom',
      custom_category: known ? '' : entry.category,
      hours: String(entry.hours),
      completed_on: entry.completed_on,
      certificate_url: entry.certificate_url ?? '',
      notes: entry.notes,
    });
    setEditError(null);
    setEditingEntry(entry);
  }

  async function handleEditEntry(e: FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    const hoursNum = Number(editForm.hours);
    const category = editForm.category === 'custom' ? editForm.custom_category.trim() : editForm.category;
    if (!editForm.course_name.trim() || !Number.isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 100) {
      setEditError('Check the course name and hours.');
      return;
    }
    const cert = editForm.certificate_url.trim();
    if (cert && !cert.startsWith('https://')) {
      setEditError('Certificate links need to start with https://.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    const res = await apiSend<{ entry: CeEntry; license: LicenseWithProgress | null }>(`/api/ce-entries/${editingEntry.id}`, 'PATCH', {
      course_name: editForm.course_name.trim(),
      provider_name: editForm.provider_name.trim(),
      category: category || 'general',
      hours: hoursNum,
      completed_on: editForm.completed_on,
      certificate_url: cert || null,
      notes: editForm.notes.trim(),
    });
    setEditSaving(false);
    if (res.error || !res.data) {
      setEditError(res.error ?? 'We could not save those changes.');
      return;
    }
    setEntries((prev) => prev.map((entry) => (entry.id === res.data!.entry.id ? res.data!.entry : entry)));
    if (res.data.license) setLicense(res.data.license);
    setEditingEntry(null);
    toast('success', 'Entry updated.');
  }

  async function handleDeleteEntry(id: string) {
    if (!window.confirm('Remove this course entry?')) return;
    const res = await apiSend<{ id: string; deleted: boolean; license: LicenseWithProgress | null }>(`/api/ce-entries/${id}`, 'DELETE');
    if (res.error) {
      toast('error', res.error);
      return;
    }
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (res.data?.license) setLicense(res.data.license);
    toast('info', 'Entry removed.');
  }

  async function dismissAlert(id: string) {
    const res = await apiSend<Alert>(`/api/alerts/${id}`, 'PATCH', { status: 'dismissed' });
    if (res.data) {
      setAlerts((prev) => prev.map((a) => (a.id === id ? res.data! : a)));
      toast('info', 'Alert dismissed.');
    } else {
      toast('error', res.error ?? 'We could not dismiss that alert.');
    }
  }

  function openEditLicense() {
    if (!license) return;
    setLicenseForm({
      label: license.label,
      license_number: license.license_number,
      status: license.status,
      renewal_deadline: license.renewal_deadline,
      current_period_start: license.current_period_start ?? '',
      hours_required_override: license.hours_required_override === null ? '' : String(license.hours_required_override),
      notes: license.notes,
    });
    setLicenseError(null);
    setEditOpen(true);
  }

  async function handleLicenseSave(e: FormEvent) {
    e.preventDefault();
    if (!license || !licenseForm) return;
    if (!licenseForm.renewal_deadline) {
      setLicenseError('A renewal deadline is required.');
      return;
    }
    const overrideRaw = licenseForm.hours_required_override.trim();
    const overrideNum = overrideRaw === '' ? null : Number(overrideRaw);
    if (overrideNum !== null && (!Number.isFinite(overrideNum) || overrideNum < 0)) {
      setLicenseError('Hour overrides must be zero or more.');
      return;
    }
    setLicenseSaving(true);
    setLicenseError(null);
    const res = await apiSend<LicenseWithProgress>(`/api/licenses/${license.id}`, 'PATCH', {
      label: licenseForm.label.trim(),
      license_number: licenseForm.license_number.trim(),
      status: licenseForm.status,
      renewal_deadline: licenseForm.renewal_deadline,
      current_period_start: licenseForm.current_period_start || null,
      hours_required_override: overrideNum,
      notes: licenseForm.notes.trim(),
    });
    setLicenseSaving(false);
    if (res.error || !res.data) {
      setLicenseError(res.error ?? 'We could not save those changes.');
      return;
    }
    setEditOpen(false);
    toast('success', 'License updated. Alerts re-armed to match.');
    await load();
  }

  async function handleDeleteLicense() {
    if (!license) return;
    if (!window.confirm('Delete this license and all of its CE entries? This cannot be undone.')) return;
    const res = await apiSend<{ id: string; deleted: boolean }>(`/api/licenses/${license.id}`, 'DELETE');
    if (res.error) {
      toast('error', res.error);
      return;
    }
    router.push('/licenses');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-28" />
        <div className="skeleton h-40" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (notFound || !license) {
    return (
      <div className="card mx-auto mt-12 max-w-md p-8 text-center">
        <h1 className="text-lg font-bold">We could not find that license</h1>
        <p className="mt-2 text-sm text-slate-600">{loadError ?? 'It may have been removed.'}</p>
        <Link href="/licenses" className="btn-primary mt-6">Back to licenses</Link>
      </div>
    );
  }

  const p = license.progress;
  const pct = p.percent_complete ?? 0;
  const rule = license.state_rule;
  const pendingAlerts = alerts.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-6">
      <Link href="/licenses" className="text-sm font-semibold text-emerald-700 underline">Back to licenses</Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
              license.profession === 'real_estate' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
            }`}
          >
            {license.state_code}
          </span>
          <div>
            <h1 className="text-xl">{license.label || `${license.state_code} ${professionLabel(license.profession)}`}</h1>
            <p className="text-sm text-slate-500">
              {professionLabel(license.profession)}
              {license.license_class !== 'all' ? ` · ${prettyCategory(license.license_class)}` : ''}
              {license.license_number ? ` · #${license.license_number}` : ''}
              {` · ${prettyCategory(license.status)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openEditLicense} className="btn-secondary">Edit license</button>
          <button onClick={handleDeleteLicense} className="btn-danger">Delete</button>
        </div>
      </div>

      <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Renewal countdown</p>
          <p className="mt-1 font-display text-4xl font-bold text-slate-900">{countdownLabel(p.days_until_renewal)}</p>
          <p className="mt-1 text-sm text-slate-500">
            Deadline {formatDate(license.renewal_deadline)}
            {license.current_period_start ? `, period started ${formatDate(license.current_period_start)}` : ''}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold ${countdownTone(p.days_until_renewal)}`}>
          {p.days_until_renewal < 0 ? 'Past due' : p.days_until_renewal <= 30 ? 'Urgent' : p.days_until_renewal <= 90 ? 'Coming up' : 'On track'}
        </span>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">CE progress</h2>
            <p className="text-sm font-semibold text-slate-700">
              {p.hours_required !== null
                ? `${formatHours(p.hours_completed)} of ${formatHours(p.hours_required)} hrs`
                : `${formatHours(p.hours_completed)} hrs logged`}
            </p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div key={p.hours_completed} className="bar-fill h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          {p.hours_required !== null && p.hours_remaining === 0 && (
            <p className="pop-in mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              Requirement met for this period. You are clear.
            </p>
          )}
          {p.hours_remaining !== null && p.hours_remaining > 0 && p.days_until_renewal <= 30 && p.days_until_renewal >= 0 && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Cutting it close: {formatHours(p.hours_remaining)} hrs due in {p.days_until_renewal} days.
            </p>
          )}
          {p.hours_required === null && (
            <p className="mt-3 text-xs text-slate-500">
              No state rule matched, so there is no hour target yet. Set an override in Edit license.
            </p>
          )}
          {p.category_progress.length > 0 && (
            <div className="mt-5 space-y-3">
              {p.category_progress.map((c) => {
                const cpct = c.hours_required > 0 ? Math.min(100, Math.round((c.hours_completed / c.hours_required) * 100)) : 0;
                return (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{prettyCategory(c.category)}</span>
                      <span>{formatHours(c.hours_completed)} of {formatHours(c.hours_required)} hrs</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${cpct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-base font-bold">State rule</h2>
          {rule ? (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold">{formatHours(rule.total_hours_required)} hours</span> {formatPeriod(rule.renewal_period_months)}
              </p>
              <p className="text-xs text-slate-500">{renewalBasisLabel(rule.renewal_basis, rule.fixed_renewal_month, rule.fixed_renewal_day)}</p>
              {rule.category_requirements.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rule.category_requirements.map((c) => (
                    <span key={c.category} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {prettyCategory(c.category)}: {formatHours(c.hours)} hrs
                    </span>
                  ))}
                </div>
              )}
              {rule.notes && <p className="text-xs text-slate-500">{rule.notes}</p>}
              <a href={rule.source_url} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-emerald-700 underline">
                Official source, verified {formatDate(rule.last_verified_on)}
              </a>
              <p className="text-xs text-slate-400">Rules change. Confirm with your state board before relying on a date.</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No rule on file for this combination yet. Your countdown and hour log still work. Set an hour target in Edit
              license.
            </p>
          )}
        </section>
      </div>

      <section className="card p-6">
        <h2 className="text-base font-bold">Log a course</h2>
        <p className="mt-1 text-xs text-slate-500">From any provider. Hours count toward this license right away.</p>
        <form onSubmit={handleAddEntry} className="mt-4 space-y-4">
          <EntryFields form={entryForm} onChange={(patch) => setEntryForm((f) => ({ ...f, ...patch }))} categories={categories} idPrefix="add" />
          {entryError && <p className="text-sm text-red-700">{entryError}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={entrySaving} className="btn-primary">
              {entrySaving ? 'Logging' : 'Log course'}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-bold">Course history</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No courses logged yet. Your first entry lands here the moment you log it.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{entry.course_name}</p>
                  <p className="text-xs text-slate-500">
                    {formatHours(entry.hours)} hrs · {prettyCategory(entry.category)} · {formatDate(entry.completed_on)}
                    {entry.provider_name ? ` · ${entry.provider_name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {entry.certificate_url && (
                    <a href={entry.certificate_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-700 underline">
                      Certificate
                    </a>
                  )}
                  <button onClick={() => openEditEntry(entry)} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    aria-label={`Delete ${entry.course_name}`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-bold">Countdown alerts</h2>
        <p className="mt-1 text-xs text-slate-500">Armed automatically at 90, 60, 30, 14, 7, and 1 days before the deadline.</p>
        {pendingAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No pending alerts. They re-arm whenever the deadline changes.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {pendingAlerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span>
                  {a.days_before}-day heads up · {formatDate(a.trigger_on)}
                </span>
                <button
                  onClick={() => dismissAlert(a.id)}
                  aria-label={`Dismiss the ${a.days_before} day alert`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingEntry && (
        <Modal title="Edit course entry" onClose={() => setEditingEntry(null)}>
          <form onSubmit={handleEditEntry} className="space-y-4">
            <EntryFields form={editForm} onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))} categories={categories} idPrefix="edit" />
            {editError && <p className="text-sm text-red-700">{editError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingEntry(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={editSaving} className="btn-primary">{editSaving ? 'Saving' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {editOpen && licenseForm && (
        <Modal title="Edit license" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleLicenseSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="el-label" className="label">Label</label>
                <input id="el-label" className="input" value={licenseForm.label} onChange={(e) => setLicenseForm((f) => f && { ...f, label: e.target.value })} maxLength={120} />
              </div>
              <div>
                <label htmlFor="el-number" className="label">License number</label>
                <input id="el-number" className="input" value={licenseForm.license_number} onChange={(e) => setLicenseForm((f) => f && { ...f, license_number: e.target.value })} maxLength={100} />
              </div>
              <div>
                <label htmlFor="el-status" className="label">Status</label>
                <select id="el-status" className="input" value={licenseForm.status} onChange={(e) => setLicenseForm((f) => f && { ...f, status: e.target.value as LicenseStatus })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label htmlFor="el-deadline" className="label">Renewal deadline</label>
                <input id="el-deadline" type="date" className="input" value={licenseForm.renewal_deadline} onChange={(e) => setLicenseForm((f) => f && { ...f, renewal_deadline: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="el-period" className="label">Period start</label>
                <input id="el-period" type="date" className="input" value={licenseForm.current_period_start} onChange={(e) => setLicenseForm((f) => f && { ...f, current_period_start: e.target.value })} />
              </div>
              <div>
                <label htmlFor="el-override" className="label">Hour target override</label>
                <input id="el-override" type="number" min="0" max="1000" step="0.5" className="input" value={licenseForm.hours_required_override} onChange={(e) => setLicenseForm((f) => f && { ...f, hours_required_override: e.target.value })} placeholder="Blank uses the state rule" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="el-notes" className="label">Notes</label>
                <input id="el-notes" className="input" value={licenseForm.notes} onChange={(e) => setLicenseForm((f) => f && { ...f, notes: e.target.value })} maxLength={2000} />
              </div>
            </div>
            {licenseError && <p className="text-sm text-red-700">{licenseError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={licenseSaving} className="btn-primary">{licenseSaving ? 'Saving' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
