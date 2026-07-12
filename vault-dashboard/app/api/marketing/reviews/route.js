import { NextResponse } from 'next/server';
import { fetchReviews } from '@/app/lib/marketing';

export const dynamic = 'force-dynamic';

// GET /api/marketing/reviews?appStoreId=123456789[&country=us]
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const appStoreId = url.searchParams.get('appStoreId');
    const country = url.searchParams.get('country') || undefined;
    if (!appStoreId) return NextResponse.json({ success: false, error: 'appStoreId is required' }, { status: 400 });
    const reviews = await fetchReviews(appStoreId, country);
    const avg = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;
    return NextResponse.json({ success: true, count: reviews.length, averageRecent: avg, reviews });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
