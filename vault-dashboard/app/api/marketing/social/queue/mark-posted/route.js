import fs from 'fs';
import path from 'path';
import {
  SOCIAL_QUEUE_DIR,
  safeMdFilename,
  parseSocialQueueRecord,
  updateFrontmatterFields,
  appendPublishLogEntry,
} from '../../../_shared';

// The "Copy" path's confirm step — Einar copies the text, posts manually
// (LinkedIn, YouTube, or an X account with no tokens), then taps "Posted?"
// here with an optional pasted URL. Same PUBLISH_LOG append as Approve & Post.
export async function POST(req) {
  try {
    const { filename, posted_url } = await req.json();
    const safeFilename = safeMdFilename(filename);
    if (!safeFilename) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(SOCIAL_QUEUE_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Draft not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    const record = parseSocialQueueRecord(safeFilename, content, stat);
    const today = new Date().toISOString().split('T')[0];
    const url = (posted_url || '').trim();

    const updated = updateFrontmatterFields(content, { status: 'posted', posted_url: url, posted_at: today });
    fs.writeFileSync(filePath, updated, 'utf8');

    appendPublishLogEntry({
      date: today,
      channel: record.platform,
      type: record.content_type || 'wip',
      what: record.title,
      link: url,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error marking draft posted:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
