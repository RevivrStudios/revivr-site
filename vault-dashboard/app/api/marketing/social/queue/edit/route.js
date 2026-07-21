import fs from 'fs';
import path from 'path';
import { SOCIAL_QUEUE_DIR, safeMdFilename, parseSocialQueueRecord, writeSection } from '../../../_shared';

// Inline edit — saves the new copy back to the vault file. Edits are training
// signal (Social Plan Phase 2/7): the FIRST edit preserves the pre-edit copy
// in a `## Original Draft` section before overwriting `## Copy`, so the diff
// survives even though nothing consumes it yet (M6 will mine it into
// Voice/Edit Lessons.md). Later edits only touch `## Copy` — the original
// stays the one true "before."
export async function POST(req) {
  try {
    const { filename, copy } = await req.json();
    const safeFilename = safeMdFilename(filename);
    if (!safeFilename) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 });
    }
    if (typeof copy !== 'string' || !copy.trim()) {
      return Response.json({ error: 'copy is required' }, { status: 400 });
    }

    const filePath = path.join(SOCIAL_QUEUE_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Draft not found' }, { status: 404 });
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    const record = parseSocialQueueRecord(safeFilename, content, stat);

    if (!record.hasOriginalDraft && record.copy.trim() !== copy.trim()) {
      content = writeSection(content, 'Original Draft', record.copy);
    }
    content = writeSection(content, 'Copy', copy);

    fs.writeFileSync(filePath, content, 'utf8');
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error editing draft:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
