import { NextResponse } from 'next/server';
import { getJob } from '@/app/lib/assistant/jobs';

export const dynamic = 'force-dynamic';

// Poll an async assistant turn (Option E, Stage 2.5). Returns running/done/error
// plus, when done, the reply and the backend that answered (quinn | claude |
// claude-fallback) so the UI can be honest about which brain replied.
export async function GET(request) {
  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ success: false, error: 'jobId required' }, { status: 400 });
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ success: false, error: 'unknown or expired jobId' }, { status: 404 });
  return NextResponse.json({
    success: true,
    status: job.status,
    elapsedMs: Date.now() - job.startedAt,
    reply: job.reply ?? null,
    backend: job.backend ?? null,
    fallbackReason: job.fallbackReason ?? null,
    stopReason: job.stopReason ?? null,
    error: job.error ?? null,
  });
}
