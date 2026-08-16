'use client';

// CANONICAL global error boundary: catches failures in the root layout itself,
// so it must render its own <html> and <body>.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang='en'>
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', margin: 0 }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.1rem', color: '#0f172a', margin: 0 }}>Something hiccupped on our side</h1>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: 8 }}>Your data is safe. Give it another try.</p>
            <button
              onClick={reset}
              style={{ marginTop: 20, minHeight: 44, padding: '10px 24px', background: '#059669', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
