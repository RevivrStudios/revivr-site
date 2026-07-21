import { NextResponse } from 'next/server';
import { getThread, saveThread } from '@/app/lib/assistant/threads';
import { runAssistantTurn } from '@/app/lib/assistant/engine';
import { createJob, finishJob, failJob } from '@/app/lib/assistant/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Async submit (Option E, Stage 2.5): kick the turn off in the background and
// return a jobId the client polls via /api/assistant/chat/status. next-server is
// persistent, so the promise keeps running after the response is sent. This stops
// a slow or queue-delayed Quinn turn from blocking the request, and lets the UI
// show honest progress + which brain actually answered.
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGES = 6;

export async function POST(request) {
  try {
    const { threadId, message, images } = await request.json();
    const imgs = Array.isArray(images) ? images : [];
    if (!threadId || (!message && imgs.length === 0)) {
      return NextResponse.json({ success: false, error: 'threadId and a message or at least one image are required' }, { status: 400 });
    }
    if (imgs.length > MAX_IMAGES) {
      return NextResponse.json({ success: false, error: `At most ${MAX_IMAGES} images per message.` }, { status: 400 });
    }
    for (const img of imgs) {
      if (!img || typeof img.data !== 'string' || !ALLOWED_IMAGE_TYPES.includes(img.media_type)) {
        return NextResponse.json({ success: false, error: 'Each image needs a base64 `data` string and a supported `media_type` (png/jpeg/webp/gif).' }, { status: 400 });
      }
    }
    const thread = await getThread(threadId);
    if (!thread) {
      return NextResponse.json({ success: false, error: `Unknown thread: ${threadId}` }, { status: 404 });
    }

    const jobId = createJob(threadId);
    runAssistantTurn(thread, message, imgs)
      .then(async (result) => {
        await saveThread(thread);
        finishJob(jobId, {
          reply: result.replyText,
          backend: result.backend || 'claude',
          fallbackReason: result.fallbackReason || null,
          toolCalls: result.toolCalls || [],
          stopReason: result.stopReason || null,
        });
      })
      .catch((err) => failJob(jobId, err));

    return NextResponse.json({ success: true, jobId, status: 'running' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
