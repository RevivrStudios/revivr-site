import { GET as getOpsHealth } from '../../ops/health/route';
import { GET as getRad } from '../../rad/route';
import { GET as getIncubator } from '../../incubator/route';
import { GET as getDrift } from '../../vault/drift/route';
import { GET as getApprovals } from '../../marketing/approvals/route';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

// Server-side fan-in of the sources that hold a real judgment waiting on
// Einar — this is the "what needs me, and where?" answer for the homepage.
// Calling each route's exported GET() directly (same pattern as
// review/agenda/route.js) avoids a real HTTP round trip per source.
async function safeJson(handler, fallback) {
  try {
    const res = await handler();
    return await res.json();
  } catch (error) {
    return fallback;
  }
}

export async function GET() {
  const [health, rad, incubator, drift, approvals] = await Promise.all([
    safeJson(getOpsHealth, { checks: [] }),
    safeJson(getRad, { projects: [] }),
    safeJson(getIncubator, { experiments: [] }),
    safeJson(getDrift, { watchlist: [] }),
    safeJson(getApprovals, { approvals: [] }),
  ]);

  const pendingApprovals = (approvals.approvals || []).filter((a) => a.status === 'needs-einar-review').length;
  const blockedProjects = (rad.projects || []).filter((p) => p.health_status === 'Blocked');
  const activeExperiments = (incubator.experiments || []).filter((e) => e.status === 'active').length;
  const redChecks = (health.checks || []).filter((c) => c.state !== 'ok').length;
  const driftWarnings = (drift.watchlist || []).length;

  // Zero-count items are dropped entirely — the strip's size is the day's
  // judgment load, and a chip that always reads "0" is a dead-end-adjacent
  // module (an all-clear card pretending to be a decision).
  const items = [
    { key: 'approvals', label: 'Approvals pending', count: pendingApprovals, href: '/marketing/approvals' },
    {
      key: 'blocked',
      label: 'Blocked projects',
      count: blockedProjects.length,
      href: '/rad',
      detail: blockedProjects.map((p) => p.name).join(', '),
    },
    { key: 'active-exp', label: 'Experiments claiming active', count: activeExperiments, href: '/incubator?filter=active' },
    { key: 'health', label: 'Red health checks', count: redChecks, href: '#attention' },
    { key: 'drift', label: 'Drift warnings', count: driftWarnings, href: '/vault' },
  ].filter((item) => item.count > 0);

  return Response.json({ items }, { headers: noStoreHeaders });
}
