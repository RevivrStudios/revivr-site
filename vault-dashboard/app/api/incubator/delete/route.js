import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req) {
  try {
    const { filename } = await req.json();
    if (!filename) {
      return Response.json({ error: 'Missing filename' }, { status: 400 });
    }

    const filePath = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'VisionAppDev', 'Incubator', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
