import { NextResponse } from 'next/server';
import { recordHeartbeat, readAgentStatuses } from '@/app/lib/heartbeat';

export const dynamic = 'force-dynamic';

// POST from agent launch scripts / cron:
//   curl -X POST http://<host>:3000/api/agents/heartbeat \
//     -H 'Content-Type: application/json' \
//     -d '{"agent":"Quinn","machine":"Mac Studio","role":"Operations","status":"active"}'
export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.agent) return NextResponse.json({ success: false, error: 'agent is required' }, { status: 400 });
    const entry = await recordHeartbeat(body);
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, agents: await readAgentStatuses() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
