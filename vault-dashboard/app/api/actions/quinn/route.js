import { NextResponse } from 'next/server';
import { runQuinnAction } from '@/app/lib/quinnActions';
import { createJob, finishJob, failJob } from '@/app/lib/assistant/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Fire a one-click Quinn action in the background and return a jobId the client
// polls at /api/actions/quinn/status — same async pattern as the assistant chat,
// so a slow reasoning turn never blocks the request.
export async function POST(request) {
  try {
    const { kind, context, intent } = await request.json();
    if (!kind) return NextResponse.json({ success: false, error: 'kind is required' }, { status: 400 });

    const jobId = createJob(`action:${kind}`);
    runQuinnAction({ kind, context, intent })
      .then((result) => finishJob(jobId, { reply: result.text, backend: result.backend, fallbackReason: result.fallbackReason }))
      .catch((err) => failJob(jobId, err));

    return NextResponse.json({ success: true, jobId, status: 'running' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
