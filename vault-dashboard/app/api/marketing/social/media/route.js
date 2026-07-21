import fs from 'fs';
import path from 'path';
import { DROPS_MEDIA_DIR, listDrops, listSocialQueueDrafts, noStoreHeaders } from '../../_shared';

function dirFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((f) => f.isFile())
    .map((f) => {
      const stat = fs.statSync(path.join(dirPath, f.name));
      return { name: f.name, size: stat.size, modifiedAt: stat.mtime };
    });
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

// Groups drop media by drop (app/date attached), with a protection flag —
// "unposted" (no queue drafts yet, or any draft still drafted/approved)
// stays protected by default; only fully-resolved drops (every related
// draft posted or rejected) clear without an explicit override.
export async function GET() {
  const drops = listDrops();
  const queueDrafts = listSocialQueueDrafts();

  const groups = drops
    .map((drop) => {
      const files = dirFiles(path.join(DROPS_MEDIA_DIR, drop.folder));
      if (files.length === 0) return null; // nothing to manage — never had media, or already cleared
      const relatedDrafts = queueDrafts.filter((q) => q.source === drop.drop_id || q.source === drop.folder);
      const protectedByDefault = relatedDrafts.length === 0 || relatedDrafts.some((q) => q.status === 'drafted' || q.status === 'approved');
      const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
      return {
        drop_id: drop.drop_id,
        folder: drop.folder,
        app: drop.app,
        date: drop.date,
        title: drop.title,
        ageDays: daysSince(drop.date),
        totalBytes,
        files,
        protectedByDefault,
        draftStatuses: relatedDrafts.map((q) => q.status),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const totalBytes = groups.reduce((sum, g) => sum + g.totalBytes, 0);
  return Response.json({ groups, totalBytes }, { headers: noStoreHeaders });
}
