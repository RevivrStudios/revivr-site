import { NextResponse } from 'next/server';
import { getJob } from '@/app/lib/assistant/jobs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const job = getJob(jobId);
  if (!job) return NextResponse.json({ success: false, error: 'unknown or expired job' }, { status: 404 });
  if (job.status === 'error') return NextResponse.json({ success: true, status: 'error', error: job.error });
  if (job.status === 'done') {
    return NextResponse.json({ success: true, status: 'done', reply: job.reply, backend: job.backend, fallbackReason: job.fallbackReason });
  }
  return NextResponse.json({ success: true, status: 'running' });
}
