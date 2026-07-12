import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative } from 'path';

export const dynamic = 'force-dynamic';

import { VAULT_PATH } from '@/app/lib/config';

async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) files.push(...await walkDir(fullPath));
    else if (entry.name.endsWith('.md')) files.push(fullPath);
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
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
}

export async function GET() {
  try {
    const allFiles = await walkDir(VAULT_PATH);
    const now = new Date();

    // ── Activity Timeline ────────────────────
    const activityData = [];
    for (const filePath of allFiles) {
      const s = await stat(filePath);
      const relPath = relative(VAULT_PATH, filePath);
      const baseName = relPath.replace(/\.md$/, '').split('/').pop();
      activityData.push({
        name: baseName,
        path: relPath,
        modified: s.mtime.toISOString(),
        daysAgo: Math.floor((now - s.mtime) / (1000 * 60 * 60 * 24)),
      });
    }
    activityData.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    // Timeline buckets
    const today = activityData.filter(f => f.daysAgo === 0);
    const thisWeek = activityData.filter(f => f.daysAgo > 0 && f.daysAgo <= 7);
    const thisMonth = activityData.filter(f => f.daysAgo > 7 && f.daysAgo <= 30);
    const older = activityData.filter(f => f.daysAgo > 30);

    // ── PRD Lifecycle ────────────────────────
    const prdPipeline = { draft: [], 'in-progress': [], active: [], shipped: [], archived: [] };
    for (const filePath of allFiles) {
      const content = await safeReadFile(filePath);
      const fm = extractFrontmatter(content);
      if (fm.status) {
        const relPath = relative(VAULT_PATH, filePath);
        const baseName = relPath.replace(/\.md$/, '').split('/').pop();
        const statusKey = fm.status.toLowerCase();
        if (prdPipeline[statusKey]) {
          prdPipeline[statusKey].push({ name: baseName, path: relPath, ...fm });
        } else {
          // Unknown status — put in draft
          prdPipeline.draft.push({ name: baseName, path: relPath, status: fm.status, ...fm });
        }
      }
    }

    // ── Confidence Scores ─────────────────────
    const confidenceData = [];
    for (const filePath of allFiles) {
      const content = await safeReadFile(filePath);
      const fm = extractFrontmatter(content);
      const relPath = relative(VAULT_PATH, filePath);
      const baseName = relPath.replace(/\.md$/, '').split('/').pop();
      if (fm.confidence_score !== undefined) {
        confidenceData.push({
          name: baseName,
          path: relPath,
          score: parseInt(fm.confidence_score, 10) || 0,
          lastVerified: fm.last_verified || null,
          targetOS: fm.target_os || null,
          authorAI: fm.author_ai || null,
        });
      }
    }
    confidenceData.sort((a, b) => a.score - b.score);

    // ── Link Density ──────────────────────────
    let totalLinks = 0;
    for (const filePath of allFiles) {
      const content = await safeReadFile(filePath);
      const links = content.match(/\[\[([^\]]+)\]\]/g) || [];
      totalLinks += links.length;
    }
    const avgLinksPerDoc = allFiles.length > 0 ? (totalLinks / allFiles.length).toFixed(1) : 0;

    // ── Vault Growth Snapshot ─────────────────
    // Read or create the growth log
    const growthLogPath = join(process.cwd(), 'vault-growth.json');
    let growthHistory = [];
    try {
      const raw = await readFile(growthLogPath, 'utf-8');
      growthHistory = JSON.parse(raw);
    } catch { /* first run */ }

    // Append today's snapshot if not already logged today
    const todayStr = now.toISOString().slice(0, 10);
    const lastEntry = growthHistory[growthHistory.length - 1];
    if (!lastEntry || lastEntry.date !== todayStr) {
      growthHistory.push({
        date: todayStr,
        fileCount: allFiles.length,
        totalLinks,
        avgLinks: parseFloat(avgLinksPerDoc),
      });
      // Keep last 90 days
      if (growthHistory.length > 90) growthHistory = growthHistory.slice(-90);
      const { writeFile } = await import('fs/promises');
      await writeFile(growthLogPath, JSON.stringify(growthHistory, null, 2));
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      activity: {
        today: today,
        thisWeek: thisWeek,
        thisMonth: thisMonth,
        older: older.length,
        recentFiles: activityData.slice(0, 10),
      },
      prdPipeline,
      confidence: confidenceData,
      linkDensity: {
        totalLinks,
        avgLinksPerDoc: parseFloat(avgLinksPerDoc),
        totalFiles: allFiles.length,
      },
      growthHistory,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
