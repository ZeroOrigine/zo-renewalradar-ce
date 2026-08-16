// CANONICAL auth layout: centered card chrome for login, signup, and password pages.
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your account | RenewalRadar CE',
  description:
    'Sign in to RenewalRadar CE. Every state, every CE deadline, one radar.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-emerald-50">
      <header className="px-6 py-5">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm transition-transform group-hover:scale-105">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.4" />
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" opacity="0.7" />
              <path d="M12 12 L18.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            RenewalRadar <span className="text-emerald-600">CE</span>
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-slate-400">
        <p>
          Deadlines for every state, one radar.{' '}
          <Link href="/" className="underline hover:text-slate-600">
            Back to home
          </Link>
        </p>
        <p className="mt-2">
          Born autonomously at{' '}
          <a
            href="https://zeroorigine.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            ZeroOrigine
          </a>
        </p>
      </footer>
    </div>
  )
}
