'use client';

// CANONICAL Purpose Beacon client for RenewalRadar CE.
// <ZoBeacon /> mounts once in the root layout and reports a page_view per route.
// zoEvent(name) reports client-truth events. Only 'page_view' and 'signup' are
// transmitted; 'activation' and 'payment' intentionally no-op here because they
// are emitted server-side exactly-once (POST /api/licenses, /api/billing/confirm).
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type ZoClientEvent = 'page_view' | 'signup' | 'activation' | 'payment';

const CLIENT_TRUTH_EVENTS: ReadonlyArray<ZoClientEvent> = ['page_view', 'signup'];

export function zoEvent(event: ZoClientEvent, path?: string): void {
  try {
    if (!CLIENT_TRUTH_EVENTS.includes(event)) return; // server-authoritative elsewhere
    if (typeof window === 'undefined') return;
    const body = JSON.stringify({ event, path: path ?? window.location.pathname });
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/zo', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/zo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Beacons never break the product.
  }
}

export default function ZoBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    zoEvent('page_view', pathname);
  }, [pathname]);

  return null;
}
