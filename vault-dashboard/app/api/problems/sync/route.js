import { NextResponse } from 'next/server';
import { syncBlockersToBoard } from '@/app/lib/problemsSync';

export const dynamic = 'force-dynamic';

// On-demand regenerate of the Operating Board's dashboard-blockers block.
// The Problems API mirrors automatically on every mutation; this lets a
// scheduled task (curl with the dashboard token) reconcile on a cadence too.
export async function POST() {
  try {
    const result = await syncBlockersToBoard();
    return NextResponse.json({ success: result.ok, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
