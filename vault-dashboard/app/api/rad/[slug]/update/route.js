import fs from 'fs';
import {
  EDITABLE_FIELDS,
  safeSlug,
  radFilePath,
  writeFrontmatterField,
  writeSection,
  appendPlanningNote,
  serializeOpenTasks,
  computeDaysUntilLaunch,
} from '../../_shared';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export async function POST(req, { params }) {
  try {
    const { slug: rawSlug } = await params;
    const slug = safeSlug(rawSlug);
    if (!slug) {
      return Response.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const filePath = radFilePath(slug);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await req.json();
    const { target } = body;
    let content = fs.readFileSync(filePath, 'utf8');

    if (target === 'frontmatter') {
      const { field, value } = body;
      if (!EDITABLE_FIELDS.includes(field)) {
        return Response.json(
          { error: `Field not editable here: ${field}. Must be one of: ${EDITABLE_FIELDS.join(', ')}` },
          { status: 400 }
        );
      }
      content = writeFrontmatterField(content, field, value);
      if (field === 'target_launch_date') {
        content = writeFrontmatterField(content, 'days_until_launch', computeDaysUntilLaunch(value));
      }
    } else if (target === 'planning-note') {
      const { note } = body;
      if (!note || !note.trim()) {
        return Response.json({ error: 'note is required' }, { status: 400 });
      }
      content = appendPlanningNote(content, note.trim(), todayISO());
    } else if (target === 'tasks') {
      const { tasks } = body;
      if (!Array.isArray(tasks)) {
        return Response.json({ error: 'tasks must be an array' }, { status: 400 });
      }
      content = writeSection(content, 'Open Tasks', serializeOpenTasks(tasks));
    } else {
      return Response.json({ error: 'target must be "frontmatter", "planning-note", or "tasks"' }, { status: 400 });
    }

    content = writeFrontmatterField(content, 'last_updated', todayISO());
    fs.writeFileSync(filePath, content, 'utf8');

    return Response.json({ success: true, target });
  } catch (error) {
    console.error('Error updating RAD project:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
