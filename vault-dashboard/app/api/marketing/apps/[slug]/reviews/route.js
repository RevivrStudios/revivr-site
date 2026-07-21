import fs from 'fs';
import path from 'path';
import { APPS_DIR, noStoreHeaders, findAppFolderBySlug, parseAppProfile } from '../../../_shared';
import { fetchReviews } from '@/app/lib/appStoreReviews';

export const dynamic = 'force-dynamic';

// Recent public App Store reviews for one app, keyed on the numeric app_store_id
// recorded in its vault profile frontmatter. No App Store Connect credentials —
// this reads Apple's public per-app customer-review RSS feed.
export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    const folder = findAppFolderBySlug(slug);
    if (!folder) {
      return Response.json({ error: 'App not found' }, { status: 404, headers: noStoreHeaders });
    }
    const filePath = path.join(APPS_DIR, folder, 'app-profile.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    const { app_store_id: appStoreId } = parseAppProfile(folder, content, stat);
    if (!appStoreId) {
      // Not an error — the app just has no App Store ID recorded yet.
      return Response.json({ appStoreId: null, reviews: [] }, { headers: noStoreHeaders });
    }
    const reviews = await fetchReviews(appStoreId);
    return Response.json({ appStoreId, reviews }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error fetching App Store reviews:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
