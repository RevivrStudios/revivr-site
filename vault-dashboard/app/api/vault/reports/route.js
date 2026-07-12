import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const VAULT_ROOT = '/Users/einarjohnson/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev';
const REPORTS_DIR = path.join(VAULT_ROOT, 'Reports');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeReadFile(filePath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (err) {
      if (err.code === 'EAGAIN' || err.message.includes('-11')) {
        await wait(500 * (i + 1));
      } else {
        throw err;
      }
    }
  }
  return '';
}

export async function GET() {
  try {
    let files = [];
    try {
      files = await readdir(REPORTS_DIR);
    } catch {
      return NextResponse.json({ success: true, reports: [], totalCount: 0 });
    }

    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'MOC — Reports Archive.md');

    const reports = [];
    for (const file of mdFiles) {
      const filePath = path.join(REPORTS_DIR, file);
      const content = await safeReadFile(filePath);
      if (!content) continue;

      // Parse YAML frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const topicMatch = content.match(/^topic:\s*(.+)$/m);
      const createdMatch = content.match(/^created:\s*(.+)$/m);

      // Extract first heading after frontmatter as title
      const titleMatch = content.replace(/^---[\s\S]*?---/, '').match(/^#\s+(.+)$/m);

      // Count wikilinks in this report as a proxy for how well-connected it is
      const wikiLinks = (content.match(/\[\[.+?\]\]/g) || []).length;

      // Extract category from archive index position — fallback to filename date parsing
      const dateFromFilename = file.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || null;

      reports.push({
        filename: file,
        title: titleMatch?.[1]?.trim() || file.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace('.md', '').replace(/-/g, ' '),
        topic: topicMatch?.[1]?.trim() || '',
        created: createdMatch?.[1]?.trim() || dateFromFilename || 'Unknown',
        wikiLinks,
        slug: file.replace('.md', ''),
      });
    }

    // Sort newest first
    reports.sort((a, b) => {
      if (a.created > b.created) return -1;
      if (a.created < b.created) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      reports,
      totalCount: reports.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
