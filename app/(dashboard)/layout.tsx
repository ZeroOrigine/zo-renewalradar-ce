// CANONICAL dashboard layout: auth gate plus the app shell for every dashboard page.
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import DashboardShell from '@/components/dashboard-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  return (
    <Suspense fallback={null}>
      <DashboardShell userEmail={user.email ?? ''}>{children}</DashboardShell>
    </Suspense>
  );
}
