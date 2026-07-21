import fs from 'fs';
import path from 'path';
import {
  SOCIAL_QUEUE_DIR, GOLDEN_SET_PATH,
  safeMdFilename, parseSocialQueueRecord, updateFrontmatterFields,
} from '../../../_shared';

// Curation, not publishing: approving a golden example writes it to the
// voice corpus (17 Voice/Revivr Golden Set.md) so it can anchor future
// company-voice drafts. It does NOT post anything live — that's a separate
// decision via the normal Approve & Post/Copy actions, which stay gated on
// this corpus reaching 5 entries (Phase 7's "no unanchored company voice"
// rule). Scoped to x-company drafts only, matching that gate's scope.
export async function POST(req) {
  try {
    const { filename } = await req.json();
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

    if (record.platform !== 'x-company') {
      return Response.json({ error: 'Golden-set curation is for x-company drafts only' }, { status: 400 });
    }
    if (!record.copy.trim()) {
      return Response.json({ error: 'Draft has no copy text' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const header = `# Revivr Golden Set\n\nEinar-approved canonical company-voice examples. Anchors company drafting once this reaches 5 entries — until then, Approve & Post stays blocked for x-company (Phase 7's "no unanchored company voice" rule).\n\n`;
    const base = fs.existsSync(GOLDEN_SET_PATH) ? fs.readFileSync(GOLDEN_SET_PATH, 'utf8') : header;
    const entry = `## Entry — ${today}\n${record.copy}\n\n*Source: ${safeFilename}*\n\n`;
    fs.mkdirSync(path.dirname(GOLDEN_SET_PATH), { recursive: true });
    fs.writeFileSync(GOLDEN_SET_PATH, base.trimEnd() + '\n\n' + entry, 'utf8');

    const updated = updateFrontmatterFields(content, { status: 'approved-golden' });
    fs.writeFileSync(filePath, updated, 'utf8');

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error approving golden example:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
