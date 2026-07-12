import { NextResponse } from 'next/server';
import { loadLatestItems, loadFeedsConfig, listBriefings, readBriefing } from '@/app/lib/awareness';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const briefingFile = url.searchParams.get('briefing');
    if (briefingFile) {
      const content = await readBriefing(briefingFile);
      if (content == null) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, filename: briefingFile, content });
    }

    const [snapshot, feeds, briefings] = await Promise.all([
      loadLatestItems(), loadFeedsConfig(), listBriefings(),
    ]);
    const latestBriefing = briefings[0] ? await readBriefing(briefings[0]) : null;
    return NextResponse.json({
      success: true,
      fetchedAt: snapshot.fetchedAt,
      items: snapshot.items,
      errors: snapshot.errors,
      feeds,
      briefings,
      latestBriefing: latestBriefing ? { filename: briefings[0], content: latestBriefing } : null,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
