// CANONICAL billing page shell: reads checkout return params server-side with force-dynamic.
import BillingClient from './billing-client';

export const dynamic = 'force-dynamic';

export default function BillingPage({ searchParams }: { searchParams?: { checkout?: string; billing?: string } }) {
  const raw = searchParams?.checkout;
  const checkout = raw === 'success' ? ('success' as const) : raw === 'cancel' ? ('cancel' as const) : null;
  const billing = searchParams?.billing ?? null;
  return <BillingClient checkout={checkout} billing={billing} />;
}
