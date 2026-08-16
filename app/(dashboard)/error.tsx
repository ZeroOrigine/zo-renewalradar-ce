'use client';

// CANONICAL dashboard error boundary.
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto mt-16 max-w-md p-8 text-center">
      <h2 className="text-lg font-bold text-slate-900">Something hiccupped on our side</h2>
      <p className="mt-2 text-sm text-slate-600">Your data is safe. Give it another try.</p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
