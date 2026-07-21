import fs from 'fs';
import path from 'path';
import {
  APPROVALS_DIR,
  MARKETING_VAULT_ROOT,
  extractDraftSection,
  draftAsImagePath,
  imageMimeForExt,
  safeMdFilename,
} from '../../_shared';

// The client only ever passes a bare approval-record filename (same discipline
// as /api/incubator/update) — the image path itself is resolved server-side from
// that record's own ## Draft section and whitelisted against the vault root.
// This avoids ever trusting a client-supplied filesystem path directly.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const safeFilename = safeMdFilename(searchParams.get('file'));
    if (!safeFilename) {
      return new Response('Invalid file', { status: 400 });
    }

    const approvalPath = path.join(APPROVALS_DIR, safeFilename);
    if (!fs.existsSync(approvalPath)) {
      return new Response('Not found', { status: 404 });
    }

    const content = fs.readFileSync(approvalPath, 'utf8');
    const imagePath = draftAsImagePath(extractDraftSection(content));
    if (!imagePath) {
      return new Response('No image on this record', { status: 404 });
    }

    const resolved = path.resolve(imagePath);
    const vaultRoot = path.resolve(MARKETING_VAULT_ROOT);
    if (!resolved.startsWith(vaultRoot + path.sep)) {
      return new Response('Path outside vault', { status: 403 });
    }
    if (!fs.existsSync(resolved)) {
      return new Response('Image file missing on disk', { status: 404 });
    }

    const mime = imageMimeForExt(path.extname(resolved));
    if (!mime) {
      return new Response('Unsupported image type', { status: 415 });
    }

    const data = fs.readFileSync(resolved);
    return new Response(data, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving approval image:', error);
    return new Response('Server error', { status: 500 });
  }
}
