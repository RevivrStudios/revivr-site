import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req) {
  try {
    const { filename, fields } = await req.json();
    if (!filename || !fields) {
      return Response.json({ error: 'Missing filename or fields' }, { status: 400 });
    }

    const filePath = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'VisionAppDev', 'Incubator', filename);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
    const match = content.match(frontmatterRegex);
    
    if (match && match[1]) {
      let frontmatter = match[1];
      let lines = frontmatter.split('\n');
      
      // Auto-update last_touched
      if (!fields.last_touched) {
          fields.last_touched = new Date().toISOString().split('T')[0];
      }
      
      Object.keys(fields).forEach(key => {
        let found = false;
        lines = lines.map(line => {
          if (line.trim().startsWith(key + ':')) {
            found = true;
            return `${key}: ${fields[key]}`;
          }
          return line;
        });
        if (!found && key) {
           lines.push(`${key}: ${fields[key]}`);
        }
      });
      
      const newFrontmatter = lines.join('\n');
      content = content.replace(match[1], newFrontmatter);
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating experiment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
