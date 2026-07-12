import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';

export const dynamic = 'force-dynamic';

import { VAULT_PATH } from '@/app/lib/config';

async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

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
  console.warn(`[Vault] Giving up on iCloud download for ${filePath} after ${retries} attempts.`);
  return '';
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) fm[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  });
  return fm;
}

function countWikilinks(content) {
  const outgoing = (content.match(/\[\[([^\]]+)\]\]/g) || []);
  return outgoing.map(l => {
    const inner = l.replace(/\[\[|\]\]/g, '').split('|')[0].split('#')[0].trim();
    return inner.split('/').pop();
  });
}

export async function GET() {
  try {
    const allFiles = await walkDir(VAULT_PATH);
    const results = [];
    const allLinkedTargets = new Set();

    for (const filePath of allFiles) {
      let content = await safeReadFile(filePath);
      const relPath = relative(VAULT_PATH, filePath);
      const fm = extractFrontmatter(content);
      const outgoingLinks = countWikilinks(content);

      outgoingLinks.forEach(link => allLinkedTargets.add(link));

      results.push({
        file: relPath,
        frontmatter: fm,
        outgoingLinkCount: outgoingLinks.length,
        outgoingLinks,
        hasFrontmatter: fm !== null,
        hasType: fm?.type ? true : false,
        lastVerified: fm?.last_verified || fm?.last_verified_date || null,
        confidenceScore: fm?.confidence_score || null,
      });
    }

    // Determine orphans (no outgoing links AND not linked to by anyone)
    const fileBasenames = new Map();
    results.forEach(r => {
      const basename = r.file.replace(/\.md$/, '').split('/').pop();
      fileBasenames.set(basename, r);
    });

    const orphans = [];
    const decayed = [];
    const missingFrontmatter = [];
    const missingType = [];
    const healthy = [];

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    for (const r of results) {
      const basename = r.file.replace(/\.md$/, '').split('/').pop();
      const isLinkedTo = allLinkedTargets.has(basename);
      r.incomingLinks = isLinkedTo;

      if (!isLinkedTo) {
        orphans.push(r);
      } else {
        healthy.push(r);
      }

      if (!r.hasFrontmatter) {
        missingFrontmatter.push(r);
      } else if (!r.hasType) {
        missingType.push(r);
      }

      if (r.lastVerified) {
        const verifiedDate = new Date(r.lastVerified);
        if (verifiedDate < sixMonthsAgo) {
          decayed.push(r);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: allFiles.length,
        orphanCount: orphans.length,
        decayedCount: decayed.length,
        missingFrontmatterCount: missingFrontmatter.length,
        missingTypeCount: missingType.length,
        healthyCount: healthy.length,
        healthScore: results.length > 0 ? Math.round((healthy.length / results.length) * 100) : 0,
        offloadedCount: allFiles.length - results.length,
      },
      orphans: orphans.map(o => o.file),
      decayed: decayed.map(d => ({ file: d.file, lastVerified: d.lastVerified })),
      missingFrontmatter: missingFrontmatter.map(m => m.file),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
