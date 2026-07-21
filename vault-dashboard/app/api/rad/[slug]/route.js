import fs from 'fs';
import { noStoreHeaders, safeSlug, radFilePath, parseRadProject } from '../_shared';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { slug: rawSlug } = await params;
    const slug = safeSlug(rawSlug);
    if (!slug) {
      return Response.json({ error: 'Invalid slug' }, { status: 400, headers: noStoreHeaders });
    }
    const filePath = radFilePath(slug);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Project not found' }, { status: 404, headers: noStoreHeaders });
    }
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const project = parseRadProject(slug, content, stat);
    return Response.json({ project }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error reading RAD project:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
