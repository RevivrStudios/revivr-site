import fs from 'fs';
import path from 'path';
import {
  APPS_DIR,
  MESSAGING_FILENAME,
  REQUIRED_APP_SECTIONS,
  findAppFolderBySlug,
  writeSection,
} from '../../../_shared';

export async function POST(req, { params }) {
  try {
    const { slug } = await params;
    const folder = findAppFolderBySlug(slug);
    if (!folder) {
      return Response.json({ error: 'App not found' }, { status: 404 });
    }

    const { target, heading, body } = await req.json();
    if (typeof body !== 'string') {
      return Response.json({ error: 'Missing body' }, { status: 400 });
    }

    if (target === 'messaging') {
      const messagingPath = path.join(APPS_DIR, folder, MESSAGING_FILENAME);
      fs.writeFileSync(messagingPath, body, 'utf8');
      return Response.json({ success: true, target: 'messaging' });
    }

    if (target === 'section') {
      if (!REQUIRED_APP_SECTIONS.includes(heading)) {
        return Response.json(
          { error: `Unknown section. Must be one of: ${REQUIRED_APP_SECTIONS.join(', ')}` },
          { status: 400 }
        );
      }
      const filePath = path.join(APPS_DIR, folder, 'app-profile.md');
      const content = fs.readFileSync(filePath, 'utf8');
      const updated = writeSection(content, heading, body);
      fs.writeFileSync(filePath, updated, 'utf8');
      return Response.json({ success: true, target: 'section', heading });
    }

    return Response.json({ error: 'target must be "section" or "messaging"' }, { status: 400 });
  } catch (error) {
    console.error('Error updating app profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
