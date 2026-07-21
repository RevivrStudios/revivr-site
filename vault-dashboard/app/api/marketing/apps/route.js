import fs from 'fs';
import path from 'path';
import { APPS_DIR, noStoreHeaders, listAppFolders, parseAppProfile } from '../_shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const folders = listAppFolders();
    const apps = folders.map((folder) => {
      const filePath = path.join(APPS_DIR, folder, 'app-profile.md');
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const profile = parseAppProfile(folder, content, stat);
      // List view doesn't need full section bodies — keep the payload light.
      const { sections, ...summary } = profile;
      return summary;
    });

    apps.sort((a, b) => a.title.localeCompare(b.title));

    return Response.json({ apps }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error reading app profiles:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
