import fs from 'fs';
import path from 'path';
import {
  APPS_DIR,
  MESSAGING_FILENAME,
  noStoreHeaders,
  findAppFolderBySlug,
  parseAppProfile,
  findLiveRadData,
} from '../../_shared';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    const folder = findAppFolderBySlug(slug);
    if (!folder) {
      return Response.json({ error: 'App not found' }, { status: 404, headers: noStoreHeaders });
    }

    const filePath = path.join(APPS_DIR, folder, 'app-profile.md');
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const profile = parseAppProfile(folder, content, stat);
    const radLive = findLiveRadData(profile.app_id);

    const messagingPath = path.join(APPS_DIR, folder, MESSAGING_FILENAME);
    const messagingContent = fs.existsSync(messagingPath) ? fs.readFileSync(messagingPath, 'utf8') : null;

    return Response.json({ profile, radLive, messagingContent }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error reading app profile:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
