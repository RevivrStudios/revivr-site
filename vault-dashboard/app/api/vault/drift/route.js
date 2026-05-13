import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';

const DRIFT_FILE = '/Users/einarjohnson/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev/Trackers/SDK Version & API Drift Tracker.md';

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
    const content = await safeReadFile(DRIFT_FILE);

    // Parse baseline
    const baselineMatch = content.match(/Maintained as of:\s*`([^`]+)`/);
    const platformMatch = content.match(/Platform assumption:\s*(.+)/);

    const watchlistSection = content.split('## Active Drift Watchlist')[1]?.split('## Update Template')[0] || '';
    const entries = [];
    const entryBlocks = watchlistSection.split(/### /);
    
    // The first element is the text *before* the first "### " (or the whole string if none exist).
    // We start iterating from index 1 to only parse actual "### " blocks.
    for (let i = 1; i < entryBlocks.length; i++) {
      const block = entryBlocks[i];
      const lines = block.trim().split('\n');
      const title = lines[0]?.trim();
      if (!title) continue;

      const riskMatch = lines.find(l => l.includes('Risk:'));
      const ruleMatch = lines.find(l => l.includes('Current') && l.includes('rule:'));
      const modulesMatch = lines.find(l => l.includes('Affected modules:'));

      entries.push({
        title,
        risk: riskMatch?.split('Risk:')[1]?.trim() || '',
        currentRule: ruleMatch?.split(':').slice(1).join(':')?.trim() || '',
        affectedModules: modulesMatch?.split(':').slice(1).join(':')?.trim() || '',
      });
    }

    // Parse logged drifts (date-stamped entries after Update Template)
    const loggedSection = content.split('## Update Template')[1]?.split('## Related Notes')[0] || '';
    const loggedDrifts = [];
    const driftMatches = loggedSection.matchAll(/### (\d{4}-\d{2}-\d{2}):\s*(.+)/g);
    for (const match of driftMatches) {
      loggedDrifts.push({ date: match[1], title: match[2].trim() });
    }

    return NextResponse.json({
      success: true,
      baseline: {
        lastMaintained: baselineMatch?.[1] || 'Unknown',
        platform: platformMatch?.[1]?.trim() || 'Unknown',
      },
      watchlist: entries,
      loggedDrifts,
      alertLevel: entries.length > 3 ? 'high' : entries.length > 1 ? 'medium' : 'low',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
