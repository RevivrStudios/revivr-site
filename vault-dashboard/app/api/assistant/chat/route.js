import { NextResponse } from 'next/server';
import { getThread, saveThread } from '@/app/lib/assistant/threads';
import { runAssistantTurn } from '@/app/lib/assistant/engine';

export const dynamic = 'force-dynamic';
// Agentic turns with several tool round-trips can take a while.
export const maxDuration = 300;

export async function POST(request) {
  try {
    const { threadId, message } = await request.json();
    if (!threadId || !message) {
      return NextResponse.json({ success: false, error: 'threadId and message are required' }, { status: 400 });
    }
    const thread = await getThread(threadId);
    if (!thread) {
      return NextResponse.json({ success: false, error: `Unknown thread: ${threadId}` }, { status: 404 });
    }

    const result = await runAssistantTurn(thread, message);
    await saveThread(thread);

    return NextResponse.json({
      success: true,
      reply: result.replyText,
      toolCalls: result.toolCalls,
      stopReason: result.stopReason,
      thread: { id: thread.id, title: thread.title, project: thread.project, problemId: thread.problemId },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
