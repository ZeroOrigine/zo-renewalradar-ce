// CANONICAL: RenewalRadar CE marketing landing page. Single source of truth for the / route.
// Pricing and features on this page mirror renewalradarce_plans exactly: Free (2 licenses),
// Pro Monthly $9, Pro Annual $84. No phantom tiers, no phantom features.
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RenewalRadar CE: never miss a CE deadline in any state',
  description:
    'State CE rules, hour tracking, and countdown alerts for every license you hold. Built for real estate agents and insurance producers licensed in two or more states. Free plan included, Pro from $9 a month.',
  keywords: [
    'CE tracker',
    'continuing education deadlines',
    'real estate license renewal',
    'insurance license renewal',
    'multi-state CE compliance',
  ],
  openGraph: {
    title: 'RenewalRadar CE: never miss a CE deadline in any state',
    description:
      'State CE rules, hour tracking, and countdown alerts for every license you hold, agnostic to which course provider you use.',
    siteName: 'RenewalRadar CE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RenewalRadar CE',
    description: 'CE deadline tracking for agents and producers licensed in two or more states.',
  },
};

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';
const btnPrimary = `inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 ${focusRing}`;
const btnGhost = `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`;

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const audiences = [
  'Real estate agents',
  'Real estate brokers',
  'Property & casualty producers',
  'Life & health producers',
  'Multi-state licensees',
];

const radarRows = [
  {
    state: 'Texas',
    lic: 'Real Estate Sales Agent',
    hours: '12 of 18 CE hours logged',
    days: '247',
    daysClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'h-1.5 rounded-full bg-emerald-500 w-2/3',
    flag: '',
  },
  {
    state: 'Florida',
    lic: 'Life & Health Producer',
    hours: '9 of 24 CE hours logged',
    days: '63',
    daysClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'h-1.5 rounded-full bg-amber-500 w-[37%]',
    flag: '',
  },
  {
    state: 'Ohio',
    lic: 'Real Estate Broker',
    hours: '6 of 30 CE hours logged',
    days: '21',
    daysClass: 'text-rose-600 dark:text-rose-400',
    barClass: 'h-1.5 rounded-full bg-rose-500 w-1/5',
    flag: '3 ethics hours still due',
  },
];

const features = [
  {
    title: 'State rules, decoded',
    body: 'Renewal cycles, required hours, and category splits in one lookup, each linked to its official source with a last-verified date. Stop cross-referencing board PDFs at midnight.',
    paths: ['M12 6.25c-2.4-1.7-5.6-2-8.25-1.15v13.5C6.4 17.75 9.6 18.05 12 19.75c2.4-1.7 5.6-2 8.25-1.15V5.1C17.6 4.25 14.4 4.55 12 6.25z', 'M12 6.25v13.5'],
  },
  {
    title: 'One ledger, any provider',
    body: 'Finish a course anywhere and log the hours here. Totals update against each state\u2019s requirement automatically.',
    paths: ['M7 4h10a2 2 0 012 2v13a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z', 'M9 9h6M9 13h6M9 17h4'],
  },
  {
    title: 'A countdown per license',
    body: 'Every license gets its own clock. Days remaining and hours outstanding, visible at a glance.',
    paths: ['M12 3a9 9 0 109 9 9 9 0 00-9-9z', 'M12 7v5l3 2'],
  },
  {
    title: 'Alerts that escalate',
    body: 'Every license arms in-app alerts at 90, 60, 30, 14, 7, and 1 days before its deadline, automatically. Pro adds email delivery so a deadline cannot sneak past even when you are not logged in.',
    paths: ['M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5', 'M9 17v1a3 3 0 006 0v-1'],
  },
  {
    title: 'Ethics and category tracking',
    body: 'Ethics, law updates, and electives tracked separately, the way state boards count them. No more guessing which hours still count.',
    paths: ['M12 3l9 5-9 5-9-5 9-5z', 'M3 13l9 5 9-5'],
  },
  {
    title: 'Neutral by design',
    body: 'We sell no courses and take no referral fees. Keeping your licenses active is the entire product.',
    paths: ['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z', 'M9.5 12l2 2 3.5-4'],
  },
];

const steps = [
  {
    n: '1',
    title: 'Add your licenses',
    body: 'State, license type, and renewal date. About two minutes for a whole wallet of licenses.',
  },
  {
    n: '2',
    title: 'Log hours as you earn them',
    body: 'Take courses from any provider. Record the hours here and watch each state\u2019s requirement fill up.',
  },
  {
    n: '3',
    title: 'Let the radar watch',
    body: 'Countdowns tick per license and alerts arm on schedule. You renew on time, every time.',
  },
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

const consequences = [
  {
    title: 'The reinstatement maze',
    body: 'Late fees, extra coursework, reapplication forms, and weeks of waiting while a state board processes your paperwork.',
  },
  {
    title: 'Business you cannot touch',
    body: 'An inactive license means deals you cannot legally close and commissions you cannot collect until the paperwork clears.',
  },
  {
    title: 'The paper trail that follows',
    body: 'Renewal and appointment applications often ask about past lapses. One missed deadline can echo on forms for years.',
  },
];

const faqs = [
  {
    q: 'Is the free plan actually useful?',
    a: 'Yes. Free tracks up to two licenses with hour logging, the state rule library, countdowns, and in-app alerts. It\u2019s a plan, not a demo.',
  },
  {
    q: 'Do you sell CE courses?',
    a: 'No. We track deadlines and hours, and that\u2019s the whole business. Take your courses from any provider and log the hours here.',
  },
  {
    q: 'Which states and license types work?',
    a: 'You can track a license from any U.S. state: you add the license, we run the countdown and the math. The rules library focuses on real estate and insurance requirements, and every hour target can be overridden to match your board\u2019s letter.',
  },
  {
    q: 'How do the alerts work?',
    a: 'Every license automatically arms alerts at 90, 60, 30, 14, 7, and 1 days before its renewal deadline. They always appear in the app; on Pro they are also delivered by email.',
  },
  {
    q: 'What happens if I hit the Free limit?',
    a: 'Nothing gets deleted. Free tracks two licenses; to add a third you upgrade to Pro from billing, and everything you already logged stays put.',
  },
  {
    q: 'Is my data secure?',
    a: 'Sessions use industry-standard authentication, your records are isolated to your account at the database level, and we never sell your information.',
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
@keyframes rrRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.rr-rise{animation:rrRise .6s ease-out both}
.rr-rise-2{animation:rrRise .6s ease-out .12s both}
@media (prefers-reduced-motion:reduce){.rr-rise,.rr-rise-2{animation:none}}
`;

function FeatureIcon({ paths }: { paths: string[] }) {
  return (
    <svg className='h-6 w-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

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

export default function LandingPage() {
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
                <a key={l.label} href={l.href} className={`rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${focusRing}`}>
                  {l.label}
                </a>
              ))}
              <Link href='/pricing' className={`rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white ${focusRing}`}>
                Plans
              </Link>
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
              <a key={l.label} href={l.href} className='block rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'>
                {l.label}
              </a>
            ))}
            <Link href='/pricing' className='block rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'>
              Plans
            </Link>
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
        <section className='relative overflow-hidden'>
          <div aria-hidden='true' className='pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950' />
          <div className='relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24'>
            <div className='rr-rise'>
              <p className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'>
                CE compliance for multi-state agents and producers
              </p>
              <h1 className='mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>
                Never lose a license to a missed CE deadline.
              </h1>
              <p className='mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300'>
                RenewalRadar CE watches the rules, the hours, and the countdown for every license you hold, in every state you hold one. Take courses anywhere. Track everything here.
              </p>
              <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
                <Link href='/signup' className={btnPrimary}>
                  Start Free
                </Link>
                <a href='#how-it-works' className={btnGhost}>
                  See how it works
                </a>
              </div>
              <p className='mt-4 text-sm text-slate-500 dark:text-slate-400'>
                Free plan included · No credit card to start · Works with any course provider
              </p>
              <div className='mt-8 flex items-center gap-3'>
                <div className='flex -space-x-2' aria-hidden='true'>
                  {['TX', 'FL', 'OH', 'CO', 'NY'].map((s) => (
                    <span key={s} className='flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-300'>
                      {s}
                    </span>
                  ))}
                </div>
                <p className='text-sm text-slate-500 dark:text-slate-400'>Built for agents juggling licenses in 2 or more states</p>
              </div>
            </div>

            <div className='rr-rise-2 relative'>
              <div aria-hidden='true' className='absolute -inset-6 rounded-3xl bg-gradient-to-tr from-emerald-200/50 via-teal-100/40 to-transparent blur-2xl dark:from-emerald-900/40 dark:via-teal-900/20' />
              <div className='relative mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900'>
                <div className='mb-4 flex items-center justify-between'>
                  <p className='text-sm font-semibold'>Your radar</p>
                  <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'>
                    3 licenses watched
                  </span>
                </div>
                <div className='space-y-3'>
                  {radarRows.map((r) => (
                    <div key={r.state} className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold'>
                            {r.state} · {r.lic}
                          </p>
                          <p className='mt-0.5 text-xs text-slate-500 dark:text-slate-400'>{r.hours}</p>
                        </div>
                        <div className='text-right'>
                          <p className={`text-xl font-bold ${r.daysClass}`}>{r.days}</p>
                          <p className='text-[10px] font-semibold uppercase tracking-wide text-slate-400'>days left</p>
                        </div>
                      </div>
                      <div className='mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800'>
                        <div className={r.barClass} />
                      </div>
                      {r.flag ? (
                        <span className='mt-3 inline-block rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'>
                          {r.flag}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className='mt-4 text-center text-[11px] text-slate-400'>Example radar: three licenses, three clocks, zero surprises</p>
              </div>
            </div>
          </div>
        </section>

        <section className='border-y border-slate-200 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-900/40'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <p className='text-center text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400'>
              Made for every kind of licensee
            </p>
            <div className='mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500 dark:text-slate-400'>
              {audiences.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </div>
          </div>
        </section>

        <section id='features' className='scroll-mt-24 py-20 sm:py-24'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='font-display text-3xl font-bold tracking-tight sm:text-4xl'>Built to keep every license active</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>
                Not a course catalog. A tracking instrument for people whose livelihood is a license.
              </p>
            </div>
            <div className='mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {features.map((f) => (
                <div key={f.title} className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'>
                    <FeatureIcon paths={f.paths} />
                  </div>
                  <h3 className='mt-4 text-base font-semibold'>{f.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id='how-it-works' className='scroll-mt-24 bg-slate-50 py-20 dark:bg-slate-900/40 sm:py-24'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='font-display text-3xl font-bold tracking-tight sm:text-4xl'>From signup to watching radar in about a minute</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>Three steps, then the product does the remembering.</p>
            </div>
            <div className='relative mt-14'>
              <div aria-hidden='true' className='absolute left-0 right-0 top-6 hidden h-px bg-slate-200 dark:bg-slate-800 md:block' />
              <div className='grid grid-cols-1 gap-10 md:grid-cols-3'>
                {steps.map((s) => (
                  <div key={s.n} className='relative'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 font-display text-lg font-bold text-white shadow-sm'>
                      {s.n}
                    </div>
                    <h3 className='mt-4 text-base font-semibold'>{s.title}</h3>
                    <p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className='bg-slate-900 py-16'>
          <div className='mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8'>
            <h2 className='font-display text-3xl font-bold tracking-tight text-white'>We make money one way</h2>
            <p className='mt-4 text-lg leading-relaxed text-slate-300'>
              Course providers get paid when you buy a course. RenewalRadar gets paid when your deadlines stay watched. Subscriptions are the entire business: no course commissions, no referral fees, no ads. That is why tracking gets to be the whole product.
            </p>
          </div>
        </section>

        <section id='pricing' className='scroll-mt-24 py-20 sm:py-24'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='font-display text-3xl font-bold tracking-tight sm:text-4xl'>Two plans, zero fine print</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>
                Start free. Stay free if two licenses is all you need. Pro is $9 a month, or $84 a year, when the radar needs to watch more.
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
                    <h3 className='text-lg font-semibold'>{p.name}</h3>
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
              <p className='mt-8 text-center text-sm text-slate-500 dark:text-slate-400'>
                Prices in USD. Cancel any time. Full plan details on the <Link href='/pricing' className='font-medium text-emerald-600 underline underline-offset-2'>pricing page</Link>.
              </p>
            </div>
          </div>
        </section>

        <section className='bg-slate-50 py-20 dark:bg-slate-900/40 sm:py-24'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-2xl text-center'>
              <h2 className='font-display text-3xl font-bold tracking-tight sm:text-4xl'>What going inactive actually costs</h2>
              <p className='mt-4 text-lg text-slate-600 dark:text-slate-300'>
                None of this is rare. It is what happens by default when nobody is watching the clock.
              </p>
            </div>
            <div className='mt-14 grid grid-cols-1 gap-6 md:grid-cols-3'>
              {consequences.map((c) => (
                <div key={c.title} className='rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900'>
                  <h3 className='text-base font-semibold'>{c.title}</h3>
                  <p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id='faq' className='scroll-mt-24 py-20 sm:py-24'>
          <div className='mx-auto max-w-3xl px-4 sm:px-6 lg:px-8'>
            <div className='text-center'>
              <h2 className='font-display text-3xl font-bold tracking-tight sm:text-4xl'>Questions, answered straight</h2>
            </div>
            <div className='mt-12 space-y-4'>
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

        <section className='bg-emerald-700 py-20'>
          <div className='mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8'>
            <h2 className='font-display text-3xl font-bold tracking-tight text-white sm:text-4xl'>Your next renewal is closer than you think</h2>
            <p className='mt-4 text-lg text-emerald-50'>
              Two minutes of setup buys years of on-time renewals. Add your licenses, log your hours, and let the radar do the remembering.
            </p>
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
              <a href='#features' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>Features</a>
              <a href='#how-it-works' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>How it works</a>
              <Link href='/pricing' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>Pricing</Link>
              <a href='#faq' className='text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'>FAQ</a>
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
