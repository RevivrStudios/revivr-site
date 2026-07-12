import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { AGENT_STATUS_FILE, HEARTBEAT_STALE_MINUTES } from '@/app/lib/config';
import { ensureDir } from '@/app/lib/vaultFs';

// Live agent presence. Agents (or their launch scripts) POST /api/agents/heartbeat;
// the roster derives online/stale/offline from the last-seen timestamp instead of
// hardcoding "ACTIVE".

async function readRaw() {
  try {
    return JSON.parse(await readFile(AGENT_STATUS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export async function recordHeartbeat({ agent, machine, role, status, detail }) {
  const all = await readRaw();
  all[agent] = {
    agent,
    machine: machine || 'unknown',
    role: role || all[agent]?.role || '',
    status: status || 'active',
    detail: detail || '',
    lastSeen: new Date().toISOString(),
  };
  await ensureDir(path.dirname(AGENT_STATUS_FILE));
  await writeFile(AGENT_STATUS_FILE, JSON.stringify(all, null, 2), 'utf-8');
  return all[agent];
}

export async function readAgentStatuses() {
  const all = await readRaw();
  const staleMs = HEARTBEAT_STALE_MINUTES * 60 * 1000;
  return Object.values(all).map((a) => {
    const age = Date.now() - new Date(a.lastSeen).getTime();
    return {
      ...a,
      derivedStatus: age <= staleMs ? 'online' : age <= staleMs * 4 ? 'stale' : 'offline',
      minutesSinceSeen: Math.round(age / 60000),
    };
  });
}
