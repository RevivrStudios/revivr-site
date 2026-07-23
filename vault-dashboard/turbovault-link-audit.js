#!/usr/bin/env node
// turbovault-link-audit — a REAL link audit for the vault page's Action Center.
//
// Drives the turbovault MCP server over stdio and runs four analyses:
//   quick_health_check    — 0-100 vault score
//   get_broken_links      — links pointing at notes that don't exist
//   get_dead_end_notes    — notes with inbound links but zero outbound
//   get_isolated_clusters — subgraphs disconnected from the main graph
// then prints a compact human-readable report (the /api/mcp/execute route
// returns stdout to the dashboard UI). Replaces the old "audit" that only
// echoed the MCP initialize handshake — a smoke test pretending to be an audit.
//
// Usage: node turbovault-link-audit.js [vault-path]

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const TURBOVAULT = process.env.TURBOVAULT_BINARY
  || path.join(os.homedir(), '.gemini', 'antigravity', 'mcp', 'turbovault-mcp', 'turbovault');
const VAULT = process.argv[2] || process.env.VAULT_PATH
  || path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Obsidian', 'VisionAppDev');

const CALLS = [
  { id: 10, name: 'quick_health_check' },
  { id: 11, name: 'get_broken_links' },
  { id: 12, name: 'get_dead_end_notes' },
  { id: 13, name: 'get_isolated_clusters' },
];

function extract(result) {
  // MCP tool results carry content blocks; turbovault wraps every payload as
  // { vault, operation, success, data, count?, took_ms } — unwrap .data.
  const text = (result?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
  } catch { return text; }
}

async function main() {
  const proc = spawn(TURBOVAULT, ['--vault', VAULT, '--profile', 'production'], {
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const results = {};
  let buffer = '';

  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { proc.kill(); reject(new Error('turbovault audit timed out (90s)')); }, 90000);
    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      let nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 1) {
          proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
          for (const c of CALLS) {
            proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: c.id, method: 'tools/call', params: { name: c.name, arguments: {} } }) + '\n');
          }
        } else {
          const call = CALLS.find((c) => c.id === msg.id);
          if (call) {
            results[call.name] = msg.error ? { error: msg.error.message } : extract(msg.result);
            if (Object.keys(results).length === CALLS.length) { clearTimeout(timer); proc.kill(); resolve(); }
          }
        }
      }
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });

  proc.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'link-audit', version: '1.0' } },
  }) + '\n');

  await done;

  // ── report ──────────────────────────────────────────────────────────
  const lines = [`TURBOVAULT LINK AUDIT — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, `vault: ${VAULT.split('/').pop()}`, ''];

  const h = results.quick_health_check || {};
  lines.push(`Health score: ${h.health_score ?? '?'}/100  (${h.total_notes ?? '?'} notes, ${h.total_links ?? '?'} links)`);
  lines.push(`Turbovault counts: broken=${h.broken_links_count ?? '?'} orphaned=${h.orphaned_notes_count ?? '?'} dead-ends=${h.dead_end_notes_count ?? '?'}`);

  const broken = results.get_broken_links;
  const brokenList = Array.isArray(broken) ? broken : broken?.broken_links || broken?.links || [];
  lines.push('', `Broken links: ${Array.isArray(brokenList) ? brokenList.length : '?'}`);
  if (Array.isArray(brokenList)) {
    for (const b of brokenList.slice(0, 15)) {
      const src = b.source_path || b.source || b.from || '?';
      const tgt = b.target_path || b.target || b.to || b.link_text || '?';
      lines.push(`  ${src} -> [[${tgt}]]`);
    }
    if (brokenList.length > 15) lines.push(`  … and ${brokenList.length - 15} more`);
  }

  const deadEnds = results.get_dead_end_notes;
  const deadList = Array.isArray(deadEnds) ? deadEnds : deadEnds?.dead_ends || deadEnds?.notes || [];
  lines.push('', `Dead-end notes (inbound links, zero outbound): ${Array.isArray(deadList) ? deadList.length : '?'}`);
  lines.push('  (caveat: turbovault over-reports dead-ends — verified listing notes that have outbound links; treat as an upper bound and cross-check the vault health page)');
  if (Array.isArray(deadList)) {
    for (const d of deadList.slice(0, 10)) {
      const raw = typeof d === 'string' ? d : d.path || d.name || JSON.stringify(d).slice(0, 60);
      lines.push(`  ${String(raw).replace(`${VAULT}/`, '')}`);
    }
    if (deadList.length > 10) lines.push(`  … and ${deadList.length - 10} more`);
  }

  const clusters = results.get_isolated_clusters;
  const clusterList = Array.isArray(clusters) ? clusters : clusters?.clusters || [];
  lines.push('', `Isolated clusters (disconnected from main graph): ${Array.isArray(clusterList) ? clusterList.length : '?'}`);
  if (Array.isArray(clusterList)) {
    for (const c of clusterList.slice(0, 5)) {
      const members = Array.isArray(c) ? c : c.notes || c.members || [];
      lines.push(`  cluster of ${members.length}: ${members.slice(0, 3).map((m) => (typeof m === 'string' ? m.split('/').pop() : '')).join(', ')}${members.length > 3 ? '…' : ''}`);
    }
  }

  for (const c of CALLS) {
    if (results[c.name]?.error) lines.push('', `NOTE: ${c.name} errored: ${results[c.name].error}`);
  }
  console.log(lines.join('\n'));
}

main().catch((err) => { console.error('AUDIT FAILED:', err.message); process.exit(1); });
