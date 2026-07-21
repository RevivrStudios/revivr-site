import fs from 'fs';
import { RAD_DIR, noStoreHeaders, listRadSlugs, parseRadProject, radFilePath } from './_shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const slugs = listRadSlugs();
    const projects = slugs.map((slug) => {
      const filePath = radFilePath(slug);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const full = parseRadProject(slug, content, stat);
      const { sections, openTasks, ...summary } = full;
      return summary;
    });
    projects.sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ projects }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error reading RAD projects:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
