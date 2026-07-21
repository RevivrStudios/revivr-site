import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const NOW_PATH = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'VisionAppDev', 'NOW.md');
const MAX_BETS = 3;
const FIELD_KEYS = ['why_now', 'next_action', 'done_looks_like', 'owner_lane', 'repo', 'started'];

function parseNow(content) {
  const fmMatch = content.match(/^---\s*\nupdated:\s*(.*?)\s*\n---/);
  const updated = fmMatch ? fmMatch[1].trim() : null;

  const bets = [];
  const headerRegex = /^##\s+\d+\.\s+(.+)$/gm;
  const headers = [...content.matchAll(headerRegex)];

  headers.forEach((h, i) => {
    const title = h[1].trim();
    const blockStart = h.index + h[0].length;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const block = content.slice(blockStart, blockEnd);

    const bet = { title };
    for (const key of FIELD_KEYS) {
      // [ \t]* (not \s*) so an empty value doesn't cross the newline and
      // swallow the start of the next bullet line as its "value".
      const fieldMatch = block.match(new RegExp(`\\*\\*${key}:\\*\\*[ \\t]*(.*)`));
      bet[key] = fieldMatch ? fieldMatch[1].trim() : '';
    }
    bets.push(bet);
  });

  return { updated, bets };
}

function serializeNow({ updated, bets }) {
  const lines = ['---', `updated: ${updated}`, '---', '# NOW — Active Bets (max 3)', ''];
  bets.forEach((bet, i) => {
    lines.push(`## ${i + 1}. ${bet.title}`);
    for (const key of FIELD_KEYS) {
      lines.push(`- **${key}:** ${bet[key] || ''}`);
    }
    lines.push('');
  });
  lines.push('---');
  lines.push('Everything not listed above is parked by definition.');
  lines.push('');
  return lines.join('\n');
}

export async function GET() {
  try {
    if (!fs.existsSync(NOW_PATH)) {
      return Response.json({ exists: false, updated: null, bets: [] }, { headers: noStoreHeaders });
    }
    const content = fs.readFileSync(NOW_PATH, 'utf8');
    return Response.json({ exists: true, ...parseNow(content) }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const bets = Array.isArray(body.bets) ? body.bets : [];

    if (bets.length > MAX_BETS) {
      return Response.json(
        { error: `Max ${MAX_BETS} active bets. Kill or park something first.` },
        { status: 422, headers: noStoreHeaders }
      );
    }

    for (const bet of bets) {
      if (!bet.title || !bet.title.trim()) {
        return Response.json({ error: 'Every bet needs a title.' }, { status: 400, headers: noStoreHeaders });
      }
    }

    const cleanBets = bets.map((bet) => {
      const clean = { title: bet.title.trim() };
      for (const key of FIELD_KEYS) {
        clean[key] = (bet[key] || '').trim();
      }
      return clean;
    });

    const updated = new Date().toISOString().split('T')[0];
    const content = serializeNow({ updated, bets: cleanBets });

    fs.mkdirSync(path.dirname(NOW_PATH), { recursive: true });
    fs.writeFileSync(NOW_PATH, content, 'utf8');

    return Response.json({ exists: true, updated, bets: cleanBets }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
