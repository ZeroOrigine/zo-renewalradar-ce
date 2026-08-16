// CANONICAL Purpose Beacon emitter (Law 116). Server side only, fail soft, never breaks a request.
import { createServiceRoleClient } from '@/lib/supabase/server';

export type ProductMetricEvent = 'page_view' | 'signup' | 'activation' | 'payment';

// Activation for RenewalRadar CE: a user tracks their first license.
export async function emitProductMetric(event: ProductMetricEvent, path: string): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    await admin.from('zo_product_metrics').insert({
      product_slug: 'renewalradarce',
      event,
      path,
    });
  } catch (error) {
    console.error('emitProductMetric skipped', error);
  }
}
