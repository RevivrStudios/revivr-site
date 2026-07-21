import { appendPublishLogEntry, parsePublishLog } from '../_shared';

export async function POST(req) {
  try {
    const { date, channel, type, what, link } = await req.json();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
    if (!what || !what.trim()) {
      return Response.json({ error: 'what is required' }, { status: 400 });
    }
    appendPublishLogEntry({
      date,
      channel: (channel || '').trim(),
      type: (type || '').trim(),
      what: what.trim(),
      link: (link || '').trim(),
    });
    return Response.json({ success: true, publishLog: parsePublishLog() });
  } catch (error) {
    console.error('Error appending publish log entry:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
