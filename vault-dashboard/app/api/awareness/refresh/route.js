import { NextResponse } from 'next/server';
import { refreshAllFeeds, generateBriefing } from '@/app/lib/awareness';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// POST { briefing?: boolean } — fetch all feeds; optionally distill a briefing.
// Called from the UI button and from the scheduled job (scripts/awareness-refresh.sh).
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const snapshot = await refreshAllFeeds();

    let briefing = null;
    let briefingError = null;
    if (body?.briefing !== false) {
      try {
        briefing = await generateBriefing(snapshot);
      } catch (err) {
        briefingError = err.message;
      }
    }

    return NextResponse.json({
      success: true,
      fetched: snapshot.items.length,
      feedErrors: snapshot.errors,
      briefing: briefing?.filename || null,
      briefingError,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
