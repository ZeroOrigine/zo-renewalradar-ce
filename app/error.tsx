'use client';

// CANONICAL root error boundary: covers marketing, auth, and any tree without
// a closer boundary. The dashboard keeps its own boundary in (dashboard)/error.tsx.
export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-50 px-4'>
      <div className='w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
        <h1 className='text-lg font-bold text-slate-900'>Something hiccupped on our side</h1>
        <p className='mt-2 text-sm text-slate-600'>Your data is safe. Give it another try.</p>
        <button
          onClick={reset}
          className='mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'
        >
          Try again
        </button>
      </div>
    </main>
  );
}
