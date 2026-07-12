import { NextResponse } from 'next/server';
import { listThreads, createThread } from '@/app/lib/assistant/threads';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ success: true, threads: await listThreads() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const thread = await createThread(body || {});
    return NextResponse.json({ success: true, thread });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
