'use client';

// CANONICAL settings page: profile, timezone, alert preferences.
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { apiGet, apiSend } from '@/lib/core/api';
import { TIMEZONES } from '@/lib/core/format';
import type { Entitlement, Profile } from '@/lib/db/types';

interface MePayload { profile: Profile; entitlement: Entitlement; license_count: number; }

export default function SettingsPage() {
  const { toast } = useToast();
  const [me, setMe] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<MePayload>('/api/me').then((res) => {
      if (res.data) {
        setMe(res.data);
        setFullName(res.data.profile.full_name);
        setTimezone(res.data.profile.timezone);
        setEmailAlerts(res.data.profile.email_alerts_enabled);
      } else {
        setLoadError(res.error);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await apiSend<Profile>('/api/me', 'PATCH', {
      full_name: fullName.trim(),
      timezone,
      email_alerts_enabled: emailAlerts,
    });
    setSaving(false);
    if (res.error || !res.data) {
      toast('error', res.error ?? 'We could not save your settings. Please try again.');
      return;
    }
    setMe((prev) => (prev ? { ...prev, profile: res.data! } : prev));
    toast('success', 'Settings saved.');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!me) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError ?? 'We could not load your settings. Refresh to try again.'}</div>;
  }

  const tzOptions = timezone && !TIMEZONES.includes(timezone) ? [timezone, ...TIMEZONES] : TIMEZONES;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Your profile and how we reach you.</p>
      </div>

      <section className="card p-6">
        <h2 className="text-base font-bold">Account</h2>
        <p className="mt-2 text-sm text-slate-700">{me.profile.email ?? 'No email on file'}</p>
        <p className="mt-1 text-xs text-slate-500">Sign-in email. It cannot be changed here.</p>
      </section>

      <form onSubmit={handleSave} className="card space-y-5 p-6">
        <h2 className="text-base font-bold">Profile</h2>
        <div>
          <label htmlFor="set-name" className="label">Full name</label>
          <input id="set-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="set-tz" className="label">Timezone</label>
          <select id="set-tz" className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div className="flex items-start gap-3">
          <input
            id="set-alerts"
            type="checkbox"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="set-alerts" className="text-sm text-slate-700">
            <span className="font-medium">Email countdown alerts</span>
            <span className="block text-xs text-slate-500">
              Countdown emails send on the Pro plan. In-app countdowns are always on.
            </span>
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving' : 'Save settings'}</button>
        </div>
      </form>

      <section className="card p-6">
        <h2 className="text-base font-bold">Plan</h2>
        <p className="mt-2 text-sm text-slate-700">
          {me.entitlement.plan_name} plan · {me.license_count} {me.license_count === 1 ? 'license' : 'licenses'} tracked
          {me.entitlement.max_licenses !== null ? ` of ${me.entitlement.max_licenses}` : ''}
        </p>
        <Link href="/billing" className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">
          Manage plan and billing
        </Link>
      </section>
    </div>
  );
}
