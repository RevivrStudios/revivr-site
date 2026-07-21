import { NextResponse } from 'next/server';
import { syncAppStoreIds } from '@/app/lib/ascSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Populate app_store_id in the marketing-vault profiles from App Store Connect
// (read-only asc query). Triggered weekly by com.revivr.asc-sync-ids and
// on-demand here. Returns a summary of what was matched / written / skipped.
export async function POST() {
  try {
    const result = await syncAppStoreIds();
    return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
