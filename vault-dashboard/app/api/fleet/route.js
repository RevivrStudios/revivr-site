import { NextResponse } from 'next/server';
import { listSessions, groupByMachine } from '@/app/lib/fleet';

export const dynamic = 'force-dynamic';

// Read-only fleet view: every machine's active AI sessions, grouped, with
// liveness computed against the shared heartbeat staleness window.
export async function GET() {
  const { sessions, available, dir, staleMinutes } = await listSessions();
  const machines = groupByMachine(sessions);
  return NextResponse.json(
    {
      available,
      dir,
      staleMinutes,
      generatedAt: new Date().toISOString(),
      totalSessions: sessions.length,
      liveSessions: sessions.filter((s) => !s.stale).length,
      machines,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
