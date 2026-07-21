import { NextResponse } from 'next/server';
import { syncAscRenewals } from '@/app/lib/ascSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Regenerate the App Store Connect renewals block in RENEWALS.md from
// `asc certificates list` + `asc profiles list` (read-only). Triggered weekly
// by com.revivr.asc-sync-ids and on-demand here.
export async function POST() {
  try {
    const result = await syncAscRenewals();
    return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
