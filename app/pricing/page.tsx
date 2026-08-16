// CANONICAL: RenewalRadar CE pricing page. Single source of truth for the /pricing route.
// Numbers here mirror renewalradarce_plans exactly: Free (2 licenses), Pro $9/mo, Pro Annual $84/yr.
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RenewalRadar CE pricing: free plan and Pro from $9 a month',
  description:
    'Track up to two licenses free, forever. Pro adds unlimited licenses and email delivery of countdown alerts for $9 a month, or $84 a year.',
  openGraph: {
    title: 'RenewalRadar CE pricing',
    description: 'A genuinely useful free plan, plus Pro for multi-state agents at $9 a month.',
    siteName: 'RenewalRadar CE',
    type: 'website',
  },
};

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';
const btnPrimary = `inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 ${focusRing}`;
const btnGhost = `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`;

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
];

const plans = [
  {
    name: 'Free',
    tagline: 'For getting every deadline on the radar',
    m: '$0',
    y: '$0',
    yNote: 'Free either way',
    cta: 'Start Free',
    note: 'No credit card required',
    featured: false,
    features: [
      'Track up to 2 licenses',
      'Unlimited CE hour logging',
      'State rule library with official sources',
      'In-app alerts at 90, 60, 30, 14, 7, and 1 days',
      'Ethics and category progress',
    ],
  },
  {
    name: 'Pro',
    tagline: 'For agents holding licenses in several states',
    m: '$9',
    y: '$84',
    yNote: 'Save $24 a year',
    cta: 'Start with Pro',
    note: 'Starts with a free account, upgrade from billing',
    featured: true,
    features: [
      'Unlimited licenses',
      'Email delivery of countdown alerts',
      'Certificate links on every entry',
      'Everything in Free',
      'Cancel any time',
    ],
  },
];

const compareRows = [
  ['Licenses tracked', '2', 'Unlimited'],
  ['CE hour logging', 'Yes', 'Yes'],
  ['State rule library', 'Yes', 'Yes'],
  ['Countdown per license', 'Yes', 'Yes'],
  ['In-app alerts (90 to 1 days out)', 'Yes', 'Yes'],
  ['Email delivery of alerts', 'No', 'Yes'],
  ['Ethics and category progress', 'Yes', 'Yes'],
  ['Certificate links', 'Yes', 'Yes'],
  ['Price', '$0', '$9/mo or $84/yr'],
];

const faqs = [
  {
    q: 'Do I need a credit card to start?',
    a: 'No. Free requires an email address, nothing else. Upgrading happens later, from billing, only if you want it.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade, switch between monthly and annual, or cancel from your billing settings whenever you like.',
  },
  {
    q: 'What happens to my data if I downgrade?',
    a: 'Nothing gets deleted. Your licenses and CE history stay put; Free simply stops you from adding more than two licenses.',
  },
  {
    q: 'Is annual billing required?',
    a: 'No. Monthly at $9 is the default. Annual is $84, which saves $24 versus paying month to month.',
  },
];

const css = `
#rr-nav{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
#rr-nav:focus-visible ~ .rr-bar .rr-burger{outline:2px solid #059669;outline-offset:2px}
@media (max-width:767px){
#rr-nav:checked ~ .rr-panel{display:block}
#rr-nav:checked ~ .rr-bar .rr-ico-open{display:none}
#rr-nav:checked ~ .rr-bar .rr-ico-close{display:block}
}
.rr-ico-close{display:none}
#rr-billing{position:absolute;width:1px;height:1px;opacity:0}
#rr-billing:focus-visible ~ .rr-toggle .rr-track{outline:2px solid #059669;outline-offset:2px}
.rr-y{display:none}
#rr-billing:checked ~ .rr-plans span.rr-y{display:inline}
#rr-billing:checked ~ .rr-plans p.rr-y{display:block}
#rr-billing:checked ~ .rr-plans .rr-m{display:none}
#rr-billing:checked ~ .rr-toggle .rr-knob{transform:translateX(1.25rem)}
#rr-billing:checked ~ .rr-toggle .rr-track{background-color:#059669}
`;

function CheckIcon() {
  return (
    <svg className='mt-0.5 h-4 w-4 shrink-0 text-emerald-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      <path d='M5 13l4 4L19 7' />
    </svg>
  );
}

function Logo() {
  return (
    <Link href='/' className={`flex items-center gap-2 rounded-md px-1 py-1 ${focusRing}`}>
      <svg className='h-6 w-6 text-emerald-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
        <circle cx='12' cy='12' r='9' />
        <circle cx='12' cy='12' r='4.5' opacity='0.35' />
        <path d='M12 12l5.5-5.5' />
        <circle cx='12' cy='12' r='1' fill='currentColor' />
      </svg>
      <span className='font-display text-lg font-bold tracking-tight'>
        RenewalRadar <span className='text-emerald-600'>CE</span>
      </span>
    </Link>
  );
}

function CompareCell({ v }: { v: string }) {
  if (v === 'Yes') return <span className='font-medium text-emerald-600'>Yes</span>;
  if (v === 'No') return <span className='text-slate-400'>No</span>;
  return <span>{v}</span>;
}

export default function PricingPage() {
  return (
    <div className='bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
      <style>{css}</style>

      <header className='sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85'>
        <nav className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' aria-label='Main'>
          <input type='checkbox' id='rr-nav' />
          <div className='rr-bar flex h-16 items-center justify-between'>
            <Logo />
            <div className='hidden items-center gap-1 md:flex'>
              {navLinks.map((l) => (
                <Link key={l.label} href={l.href} className={`rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${focusRing}`}>
                  {l.label}
                </Link>
              ))}
            </div>
            <div className='hidden items-center gap-3 md:flex'>
              <Link href='/login' className={`rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${focusRing}`}>
                Log in
              </Link>
              <Link href='/signup' className={btnPrimary}>
                Get Started Free
              </Link>
            </div>
            <label htmlFor='rr-nav' className='rr-burger flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden'>
              <span className='sr-only'>Toggle menu</span>
              <svg className='rr-ico-open h-6 w-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                <path d='M4 7h16M4 12h16M4 17h16' />
              </svg>
              <svg className='rr-ico-close h-6 w-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                <path d='M6 6l12 12M18 6L6 18' />
              </svg>
            </label>
          </div>
          <div className='rr-panel hidden border-t border-slate-200 pb-6 pt-2 dark:border-slate-800 md:hidden'>
            {navLinks.map((l) => (
              <Link key={l.label} href={l.href} className='block rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'>
                {l.label}
              </Link>
            ))}
            <div className='mt-4 flex flex-col gap-3'>
              <Link href='/login' className={btnGhost}>
                Log in
              </Link>
              <Link href='/signup' className={btnPrimary}>
                Get Started Free
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className='py-16 sm:py-20'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h1 className='font-display text-4xl font-bold tracking-tight sm:text-5xl'>Pricing without a catalog attached</h1>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>
                Start free. Two licenses tracked, no card, no clock. Pro is $9 a month when the radar needs to watch more.
              </p>
            </div>

            <div className='mt-10'>
              <input type='checkbox' id='rr-billing' />
              <label htmlFor='rr-billing' className='rr-toggle mx-auto flex w-fit cursor-pointer items-center gap-3 text-sm font-medium'>
                <span>Monthly</span>
                <span className='rr-track relative inline-block h-7 w-12 rounded-full bg-slate-300 transition dark:bg-slate-700'>
                  <span className='rr-knob absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition' />
                </span>
                <span>
                  Annual <span className='font-semibold text-emerald-600'>save $24</span>
                </span>
              </label>

              <div className='rr-plans mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2'>
                {plans.map((p) => (
                  <div
                    key={p.name}
                    className={
                      p.featured
                        ? 'relative flex flex-col rounded-2xl border-2 border-emerald-600 bg-white p-8 shadow-lg dark:bg-slate-900'
                        : 'relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900'
                    }
                  >
                    {p.featured ? (
                      <span className='absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white'>
                        Most popular
                      </span>
                    ) : null}
                    <h2 className='text-lg font-semibold'>{p.name}</h2>
                    <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{p.tagline}</p>
                    <div className='mt-5 flex items-baseline gap-1'>
                      <span className='rr-m font-display text-4xl font-bold tracking-tight'>{p.m}</span>
                      <span className='rr-m text-sm font-medium text-slate-500'>/month</span>
                      <span className='rr-y font-display text-4xl font-bold tracking-tight'>{p.y}</span>
                      <span className='rr-y text-sm font-medium text-slate-500'>/year</span>
                    </div>
                    <p className='rr-y mt-1 text-xs font-semibold text-emerald-600'>{p.yNote}</p>
                    <ul className='mt-6 flex-1 space-y-3'>
                      {p.features.map((f) => (
                        <li key={f} className='flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300'>
                          <CheckIcon />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href='/signup' className={`mt-8 w-full ${p.featured ? btnPrimary : btnGhost}`}>
                      {p.cta}
                    </Link>
                    <p className='mt-3 text-center text-xs text-slate-500 dark:text-slate-400'>{p.note}</p>
                  </div>
                ))}
              </div>
              <p className='mt-8 text-center text-sm text-slate-500 dark:text-slate-400'>Prices in USD. Cancel any time from billing settings.</p>
            </div>
          </div>
        </section>

        <section className='bg-slate-50 py-16 dark:bg-slate-900/40 sm:py-20'>
          <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
            <h2 className='text-center font-display text-3xl font-bold tracking-tight'>Compare the plans</h2>
            <div className='mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
              <table className='w-full min-w-[480px] text-left text-sm'>
                <caption className='sr-only'>Plan comparison for RenewalRadar CE</caption>
                <thead>
                  <tr className='border-b border-slate-200 dark:border-slate-800'>
                    <th scope='col' className='px-5 py-4 font-semibold'>What you get</th>
                    <th scope='col' className='px-5 py-4 font-semibold'>Free</th>
                    <th scope='col' className='px-5 py-4 font-semibold text-emerald-600'>Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((r) => (
                    <tr key={r[0]} className='border-b border-slate-100 last:border-0 dark:border-slate-800'>
                      <th scope='row' className='px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200'>{r[0]}</th>
                      <td className='px-5 py-3.5 text-slate-600 dark:text-slate-300'><CompareCell v={r[1]} /></td>
                      <td className='px-5 py-3.5 text-slate-600 dark:text-slate-300'><CompareCell v={r[2]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className='py-16 sm:py-20'>
          <div className='mx-auto max-w-3xl px-4 sm:px-6 lg:px-8'>
            <h2 className='text-center font-display text-3xl font-bold tracking-tight'>Billing questions</h2>
            <div className='mt-10 space-y-4'>
              {faqs.map((f) => (
                <details key={f.q} className='group rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900'>
                  <summary className='flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold [&::-webkit-details-marker]:hidden'>
                    {f.q}
                    <svg className='h-5 w-5 shrink-0 text-emerald-600 transition-transform group-open:rotate-45' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                      <path d='M12 5v14M5 12h14' />
                    </svg>
                  </summary>
                  <p className='mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className='bg-emerald-700 py-16'>
          <div className='mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8'>
            <h2 className='font-display text-3xl font-bold tracking-tight text-white'>Get every deadline on the radar</h2>
            <p className='mt-4 text-lg text-emerald-50'>Two licenses tracked free, forever. Your renewal dates will thank you.</p>
            <div className='mt-8'>
              <Link href='/signup' className={`inline-flex min-h-[44px] items-center justify-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 ${focusRing}`}>
                Start Free
              </Link>
            </div>
            <p className='mt-4 text-sm text-emerald-100'>No credit card required. Free plan available.</p>
          </div>
        </section>
      </main>

      <footer className='border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'>
        <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
          <div className='flex flex-col gap-10 md:flex-row md:justify-between'>
            <div className='max-w-sm'>
              <Logo />
              <p className='mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400'>
                RenewalRadar CE keeps real estate and insurance licenses active with state rules, hour tracking, and countdown alerts per license.
              </p>
            </div>
            <nav aria-label='Footer' className='grid grid-cols-2 gap-x-12 gap-y-3 text-sm'>
              <Link href='/#features' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>Features</Link>
              <Link href='/#how-it-works' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>How it works</Link>
              <Link href='/pricing' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>Pricing</Link>
              <Link href='/#faq' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>FAQ</Link>
              <Link href='/login' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>Log in</Link>
              <Link href='/signup' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>Get started</Link>
            </nav>
          </div>
          <div className='mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between'>
            <p>© {new Date().getFullYear()} RenewalRadar CE. All rights reserved.</p>
            <p>
              Born autonomously at{' '}
              <a href='https://zeroorigine.com' className='underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200'>
                ZeroOrigine
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
