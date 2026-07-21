import fs from 'fs';
import path from 'path';
import {
  DROPS_MEDIA_DIR,
  SOCIAL_QUEUE_DIR,
  listDrops,
  listSocialQueueDrafts,
  updateDropFrontmatter,
  updateFrontmatterFields,
} from '../../../_shared';

// Destructive — Einar-click-only, never automatic (Social Plan Phase 2).
// Re-checks protection server-side regardless of what the UI already showed;
// never deletes vault markdown, only the media directory, and always stamps
// `media_cleared` on the drop note + any referencing Social Queue records so
// the site can show a "media cleared" placeholder instead of a broken preview.
export async function POST(req) {
  try {
    const { drop_ids, override } = await req.json();
    if (!Array.isArray(drop_ids) || drop_ids.length === 0) {
      return Response.json({ error: 'drop_ids is required' }, { status: 400 });
    }

    const drops = listDrops();
    const queueDrafts = listSocialQueueDrafts();
    const today = new Date().toISOString().split('T')[0];

    const cleared = [];
    const skipped = [];
    let reclaimedBytes = 0;

    for (const dropId of drop_ids) {
      const drop = drops.find((d) => d.drop_id === dropId || d.folder === dropId);
      if (!drop) {
        skipped.push({ drop_id: dropId, reason: 'not found' });
        continue;
      }

      const relatedDrafts = queueDrafts.filter((q) => q.source === drop.drop_id || q.source === drop.folder);
      const protectedByDefault = relatedDrafts.length === 0 || relatedDrafts.some((q) => q.status === 'drafted' || q.status === 'approved');
      if (protectedByDefault && !override) {
        skipped.push({ drop_id: dropId, reason: 'unposted — pass override to clear anyway' });
        continue;
      }

      const mediaDir = path.join(DROPS_MEDIA_DIR, drop.folder);
      if (fs.existsSync(mediaDir)) {
        fs.readdirSync(mediaDir, { withFileTypes: true })
          .filter((f) => f.isFile())
          .forEach((f) => {
            reclaimedBytes += fs.statSync(path.join(mediaDir, f.name)).size;
          });
        fs.rmSync(mediaDir, { recursive: true, force: true });
      }

      updateDropFrontmatter(drop.folder, { media_cleared: today });
      relatedDrafts.forEach((q) => {
        const filePath = path.join(SOCIAL_QUEUE_DIR, q.filename);
        if (!fs.existsSync(filePath)) return;
        const content = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(filePath, updateFrontmatterFields(content, { media_cleared: today }), 'utf8');
      });

      cleared.push(drop.drop_id);
    }

    return Response.json({ cleared, skipped, reclaimedBytes });
  } catch (error) {
    console.error('Error clearing media:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
