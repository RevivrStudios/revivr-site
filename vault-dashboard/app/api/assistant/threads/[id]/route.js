import { NextResponse } from 'next/server';
import { getThread, deleteThread } from '@/app/lib/assistant/threads';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, thread });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ok = await deleteThread(id);
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
}
