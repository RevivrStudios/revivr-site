import fs from 'fs';
import path from 'path';
import { SOCIAL_QUEUE_DIR, safeMdFilename, updateFrontmatterFields, appendLesson } from '../../../_shared';

// Reject requires a one-line lesson (Social Plan Phase 1: "Rejections carry
// a lesson field feeding Marketing Memory (same pattern as the approvals
// queue)") — unlike Approvals, this isn't an opt-in checkbox: every social
// rejection is training signal, so it always writes to Marketing Memory
// under "Social Voice Lessons".
export async function POST(req) {
  try {
    const { filename, lesson } = await req.json();
    const safeFilename = safeMdFilename(filename);
    if (!safeFilename) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 });
    }
    const note = (lesson || '').trim();
    if (!note) {
      return Response.json({ error: 'A one-line lesson is required to reject' }, { status: 400 });
    }

    const filePath = path.join(SOCIAL_QUEUE_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Draft not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    const updated = updateFrontmatterFields(content, { status: 'rejected', lesson: note });
    fs.writeFileSync(filePath, updated, 'utf8');

    const lessonCaptured = appendLesson('Social Voice Lessons', note, `social queue draft ${safeFilename}`, today);

    return Response.json({ success: true, lessonCaptured });
  } catch (error) {
    console.error('Error rejecting draft:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
