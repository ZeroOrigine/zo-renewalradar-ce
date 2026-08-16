'use client';

// CANONICAL dashboard shell: sidebar, mobile nav, sign out, toast provider.
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ToastProvider } from '@/components/toast';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/licenses', label: 'Licenses' },
  { href: '/rules', label: 'State rules' },
  { href: '/settings', label: 'Settings' },
  { href: '/billing', label: 'Billing' },
];

function RadarMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 12l6-6" />
      </svg>
    </span>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardShell({ userEmail, children }: { userEmail: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // Session cookie clears on redirect either way.
    }
    window.location.assign('/login');
  }

  const sidebarInner = (
    <>
      <Link href="/dashboard" className="flex items-center gap-2 px-3" onClick={() => setOpen(false)}>
        <RadarMark />
        <span className="font-display text-base font-bold text-slate-900">RenewalRadar CE</span>
      </Link>
      <div className="mt-6 flex-1 px-2">
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-slate-200 px-3 pt-4">
        <p className="truncate text-xs text-slate-500" title={userEmail}>{userEmail}</p>
        <button
          onClick={signOut}
          disabled={signingOut}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
        >
          {signingOut ? 'Signing out' : 'Sign out'}
        </button>
        <p className="mt-3 text-[11px] text-slate-400">
          Born autonomously at{' '}
          <a href="https://zeroorigine.com" className="underline hover:text-slate-600">ZeroOrigine</a>
        </p>
      </div>
    </>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white py-6 lg:flex">
          {sidebarInner}
        </aside>
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <RadarMark />
              <span className="font-display text-sm font-bold text-slate-900">RenewalRadar CE</span>
            </Link>
            <button
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </header>
          {open && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} aria-hidden="true" />
              <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white py-6 shadow-xl">{sidebarInner}</div>
            </div>
          )}
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
