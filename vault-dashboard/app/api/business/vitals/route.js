import { NextResponse } from 'next/server';
import { readVitalsCache } from '@/app/lib/ascAnalytics';

export const dynamic = 'force-dynamic';

// Read-only view of the cached Business Vitals. The heavy `asc` reads happen in
// the sync route (POST) so the home page never blocks on the CLI. Returns
// { status: 'unsynced' } when nothing has been synced yet.
export async function GET() {
  const cache = await readVitalsCache();
  if (!cache) return NextResponse.json({ status: 'unsynced' });
  return NextResponse.json({ status: 'ok', vitals: cache });
}
