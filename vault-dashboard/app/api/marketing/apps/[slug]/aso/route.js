import fs from 'fs';
import path from 'path';
import { APPS_DIR, noStoreHeaders, findAppFolderBySlug, parseAppProfile } from '../../../_shared';
import { fetchReviews } from '@/app/lib/appStoreReviews';
import { analyzeReviews } from '@/app/lib/reviewInsights';

export const dynamic = 'force-dynamic';

// ASO / review-intelligence for one app: rating distribution + trend, loved
// themes, pain points, and keyword candidates mined from the public review
// feed. No App Store Connect credentials — same public RSS the reviews list
// uses; the analysis is pure and local.
export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    const folder = findAppFolderBySlug(slug);
    if (!folder) return Response.json({ error: 'App not found' }, { status: 404, headers: noStoreHeaders });

    const filePath = path.join(APPS_DIR, folder, 'app-profile.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    const { app_store_id: appStoreId } = parseAppProfile(folder, content, stat);
    if (!appStoreId) return Response.json({ appStoreId: null, insights: null }, { headers: noStoreHeaders });

    const reviews = await fetchReviews(appStoreId);
    const insights = analyzeReviews(reviews);
    return Response.json({ appStoreId, insights }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('ASO insights error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
