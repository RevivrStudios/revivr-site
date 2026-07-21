import { computePerformance, writePerfCache } from '@/app/lib/socialPerformance';
import { logAction } from '@/app/lib/actionlog';
import { noStoreHeaders } from '../../../_shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Pull fresh X public_metrics for published tweets and cache the ranked result.
export async function POST() {
  try {
    const data = await computePerformance();
    if (data.status === 'ok') await writePerfCache(data);
    await logAction({
      source: 'marketing',
      action: 'social-performance-sync',
      label: 'Synced social post performance',
      success: data.status === 'ok',
      detail: data.status === 'ok' ? `${data.summary?.counted ?? 0} posts scored` : data.status,
    });
    return Response.json(data, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ status: 'error', error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
