import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
  try {
    const experimentsDir = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'VisionAppDev', 'Incubator');
    if (!fs.existsSync(experimentsDir)) {
      return Response.json({ experiments: [] });
    }

    const files = fs.readdirSync(experimentsDir);
    const experiments = [];

    for (const file of files) {
      if (file.endsWith('.md') && !file.includes('EXPERIMENT_AGENT') && !file.includes('EXPERIMENT_REGISTRY')) {
        const filePath = path.join(experimentsDir, file);
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
        const match = content.match(frontmatterRegex);
        
        let data = { filename: file, fullPath: filePath, modifiedAt: stat.mtime };
        
        if (match && match[1]) {
          const lines = match[1].split('\n');
          lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
              const key = line.slice(0, colonIndex).trim();
              const value = line.slice(colonIndex + 1).trim();
              data[key] = value;
            }
          });
          
          experiments.push(data);
        }
      }
    }

    return Response.json({ experiments });
  } catch (error) {
    console.error('Error reading experiments:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
