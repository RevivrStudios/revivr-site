import fs from 'fs';
import path from 'path';
import { DROPS_DIR, DROPS_MEDIA_DIR, listDrops, noStoreHeaders } from '../../_shared';

const VALID_CONTENT_TYPES = ['wip', 'feedback-ask', 'testflight', 'launch', 'insight'];
const MAX_FILE_BYTES = 500 * 1024 * 1024; // generous — WIP video clips are the primary media type

function pad(n) {
  return String(n).padStart(2, '0');
}

function dropIdNow() {
  const d = new Date();
  return `drop_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function safeFileName(name) {
  const base = path.basename(name || 'file');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
}

// Recent drops, newest first — feeds the tab's drop-confirmation cards
// ("Quinn is drafting…" until M3's watcher exists).
export async function GET() {
  return Response.json({ drops: listDrops() }, { headers: noStoreHeaders });
}

// multipart/form-data: `note` (required text), `app` (optional slug),
// `content_type` (optional, defaults 'wip'), `media` (zero or more files).
// Media bytes go to DROPS_MEDIA_DIR (App Support, off iCloud); only the
// vault note.md + a filename list are vault truth.
export async function POST(req) {
  try {
    const form = await req.formData();
    const note = (form.get('note') || '').toString().trim();
    const app = (form.get('app') || '').toString().trim();
    let contentType = (form.get('content_type') || 'wip').toString().trim();
    if (!VALID_CONTENT_TYPES.includes(contentType)) contentType = 'wip';

    if (!note) {
      return Response.json({ error: 'note text is required — what is this?' }, { status: 400 });
    }

    const dropId = dropIdNow();
    const today = new Date().toISOString().split('T')[0];
    const dropDir = path.join(DROPS_DIR, dropId);
    const mediaDir = path.join(DROPS_MEDIA_DIR, dropId);
    fs.mkdirSync(dropDir, { recursive: true });

    const files = form.getAll('media').filter((f) => f && typeof f.arrayBuffer === 'function' && f.size > 0);
    const savedFiles = [];
    if (files.length) {
      fs.mkdirSync(mediaDir, { recursive: true });
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) {
          return Response.json({ error: `${file.name} exceeds the 500MB limit` }, { status: 400 });
        }
        const filename = safeFileName(file.name);
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(path.join(mediaDir, filename), buffer);
        savedFiles.push(filename);
      }
    }

    const title = `${contentType === 'wip' ? 'WIP' : contentType} drop${app ? ` — ${app}` : ''} — ${today}`;
    const noteContent = `---
drop_id: ${dropId}
date: ${today}
app: ${app}
content_type: ${contentType}
channel_hints:
media: ${savedFiles.join(', ')}
---

# ${title}

${note}

## Media
${savedFiles.length ? savedFiles.join('\n') : 'none'}
`;
    fs.writeFileSync(path.join(dropDir, 'note.md'), noteContent, 'utf8');

    return Response.json({ success: true, drop_id: dropId, media: savedFiles });
  } catch (error) {
    console.error('Error creating drop:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
