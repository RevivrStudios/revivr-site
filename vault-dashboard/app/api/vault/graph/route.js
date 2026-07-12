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

export async function GET() {
  try {
    const allFiles = await walkDir(VAULT_PATH);
    const nodes = [];
    const links = [];
    const nodeIndex = new Map();

    // Build node list
    for (const filePath of allFiles) {
      const relPath = relative(VAULT_PATH, filePath);
      const baseName = relPath.replace(/\.md$/, '').split('/').pop();
      const content = await safeReadFile(filePath);
      const outgoing = (content.match(/\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g) || [])
        .map(l => {
          const inner = l.replace(/\[\[/g, '').replace(/\]\]/g, '').split('|')[0].split('#')[0].trim();
          return inner.split('/').pop(); // Match baseName
        });

      const linkCount = outgoing.length;
      nodeIndex.set(baseName, nodes.length);
      nodes.push({
        id: baseName,
        path: relPath,
        linkCount,
        outgoing,
      });
    }

    // Build link list
    for (const node of nodes) {
      for (const target of node.outgoing) {
        if (nodeIndex.has(target)) {
          links.push({
            source: node.id,
            target: target,
          });
        }
      }
    }

    // Calculate incoming counts
    const incomingCounts = {};
    for (const link of links) {
      incomingCounts[link.target] = (incomingCounts[link.target] || 0) + 1;
    }

    // Enrich nodes with connectivity score
    const enrichedNodes = nodes.map(n => ({
      id: n.id,
      path: n.path,
      outgoing: n.linkCount,
      incoming: incomingCounts[n.id] || 0,
      totalLinks: n.linkCount + (incomingCounts[n.id] || 0),
      isOrphan: n.linkCount === 0 && !(incomingCounts[n.id] > 0),
    }));

    return NextResponse.json({
      success: true,
      nodes: enrichedNodes,
      links,
      stats: {
        totalNodes: enrichedNodes.length,
        totalLinks: links.length,
        orphans: enrichedNodes.filter(n => n.isOrphan).length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
