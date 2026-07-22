import fs from 'fs';
import path from 'path';
import { SOCIAL_QUEUE_DIR, safeMdFilename, parseSocialQueueRecord, updateFrontmatterFields } from '../../../_shared';

export const dynamic = 'force-dynamic';

const TARGETS = ['x-personal', 'x-company', 'linkedin'];

// Cross-post: duplicates a draft as a sibling on another platform, so "post
// this to X AND LinkedIn" is two drafts with independently editable copy and
// independent approve/post lifecycles. repost-comment drafts can't cross to
// LinkedIn (they quote an X post — X-native by nature).
export async function POST(req) {
  try {
    const { filename, platform } = await req.json();
    const safeFilename = safeMdFilename(filename);
    if (!safeFilename) return Response.json({ error: 'Invalid filename' }, { status: 400 });
    if (!TARGETS.includes(platform)) return Response.json({ error: `Unknown target platform: ${platform}` }, { status: 400 });

    const filePath = path.join(SOCIAL_QUEUE_DIR, safeFilename);
    if (!fs.existsSync(filePath)) return Response.json({ error: 'Draft not found' }, { status: 404 });

    const content = fs.readFileSync(filePath, 'utf8');
    const record = parseSocialQueueRecord(safeFilename, content, fs.statSync(filePath));
    if (record.platform === platform) return Response.json({ error: 'Draft is already on that platform' }, { status: 400 });
    if (record.content_type === 'repost-comment' && platform === 'linkedin') {
      return Response.json({ error: 'Repost-comments quote an X post — they can\'t cross-post to LinkedIn. Duplicate manually if you want a LinkedIn version.' }, { status: 400 });
    }

    const suffix = platform === 'linkedin' ? 'li' : platform === 'x-company' ? 'xc' : 'x';
    const newId = `${record.draft_id}_${suffix}`;
    const newFilename = `${newId}.md`;
    const newPath = path.join(SOCIAL_QUEUE_DIR, newFilename);
    if (fs.existsSync(newPath)) return Response.json({ error: `Cross-post already exists: ${newFilename}` }, { status: 409 });

    // Fresh lifecycle: drafted, no posted/approved state carried over.
    const duplicated = updateFrontmatterFields(content, {
      draft_id: newId,
      platform,
      status: 'drafted',
      approved_at: '',
      posted_url: '',
      posted_at: '',
      lesson: '',
    });
    fs.writeFileSync(newPath, duplicated, 'utf8');
    return Response.json({ success: true, filename: newFilename });
  } catch (error) {
    console.error('Error duplicating draft:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
