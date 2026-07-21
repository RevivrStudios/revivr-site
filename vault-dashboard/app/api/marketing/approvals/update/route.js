import fs from 'fs';
import path from 'path';
import {
  APPROVALS_DIR,
  LESSON_SECTIONS,
  appendLesson,
  safeMdFilename,
  titleCaseFromSlug,
} from '../../_shared';

const VALID_STATUSES = ['approved', 'rejected', 'needs-changes', 'superseded'];

export async function POST(req) {
  try {
    const body = await req.json();
    const { filename, status, decisionNote, captureAsLesson, lessonSection } = body;

    const safeFilename = safeMdFilename(filename);
    if (!safeFilename) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return Response.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    const filePath = path.join(APPROVALS_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    const notes = (decisionNote || '').trim();

    // Update frontmatter: status, and approved_at when approving.
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    let appId = '';
    if (fmMatch) {
      let lines = fmMatch[1].split('\n');
      let statusFound = false;
      let approvedAtFound = false;
      lines = lines.map((line) => {
        if (/^app_id:/.test(line.trim())) appId = line.split(':').slice(1).join(':').trim();
        if (/^status:/.test(line.trim())) {
          statusFound = true;
          return `status: ${status}`;
        }
        if (/^approved_at:/.test(line.trim())) {
          approvedAtFound = true;
          return `approved_at: ${status === 'approved' ? today : ''}`;
        }
        return line;
      });
      if (!statusFound) lines.push(`status: ${status}`);
      if (!approvedAtFound && status === 'approved') lines.push(`approved_at: ${today}`);
      content = content.replace(fmMatch[1], lines.join('\n'));
    }

    // Update (or append) the ## Decision block in the body.
    const decisionBody = `**Status:** ${status}\n**Decision notes:** ${notes}\n`;
    const decisionBlockRegex = /##\s*Decision\s*\n([\s\S]*)$/;
    if (decisionBlockRegex.test(content)) {
      content = content.replace(decisionBlockRegex, `## Decision\n${decisionBody}`);
    } else {
      content = content.trimEnd() + `\n\n## Decision\n${decisionBody}`;
    }

    fs.writeFileSync(filePath, content, 'utf8');

    let lessonCaptured = false;
    if (captureAsLesson && notes) {
      const section = LESSON_SECTIONS.includes(lessonSection) ? lessonSection : 'Campaign Results';
      const sourceLabel = appId
        ? `app [[01 Apps/${titleCaseFromSlug(appId)}/app-profile|${titleCaseFromSlug(appId)}]]; approval ${safeFilename}`
        : `approval ${safeFilename}`;
      lessonCaptured = appendLesson(section, notes, sourceLabel, today);
    }

    return Response.json({ success: true, status, decisionNote: notes, lessonCaptured });
  } catch (error) {
    console.error('Error updating approval:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
