import { readPerfCache } from '@/app/lib/socialPerformance';
import { noStoreHeaders } from '../../_shared';

export const dynamic = 'force-dynamic';

// Read-only view of the cached social performance data. Fetching live metrics
// (rate-limited Bearer reads) happens in the sync route.
export async function GET() {
  const cache = await readPerfCache();
  if (!cache) return Response.json({ status: 'unsynced', posts: [], summary: null }, { headers: noStoreHeaders });
  return Response.json(cache, { headers: noStoreHeaders });
}
