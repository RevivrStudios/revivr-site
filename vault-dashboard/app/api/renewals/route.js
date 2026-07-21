import { NextResponse } from 'next/server';
import { listRenewals } from '@/app/lib/renewals';

export const dynamic = 'force-dynamic';

// Read-only view of RENEWALS.md with per-item expiry radar. No writes — the
// markdown file in Infrastructure/ is the source of truth, edited by hand.
export async function GET() {
  try {
    return NextResponse.json({ success: true, items: await listRenewals() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
