import fs from 'fs';
import path from 'path';
import {
  SOCIAL_QUEUE_DIR,
  safeMdFilename,
  parseSocialQueueRecord,
  updateFrontmatterFields,
  appendPublishLogEntry,
  countGoldenSetEntries,
  GOLDEN_SET_MINIMUM,
} from '../../../_shared';
import { xAccountReady, postTweet, tweetIdFromUrl } from '../../_x';

const API_PLATFORMS = ['x-personal', 'x-company'];

// Where the spacing state lives — written on every successful API post so
// the drainer (social-post-drainer.js) can enforce a minimum gap between
// posts, including gaps after a manual "Post now".
const DRAINER_STATE = path.join(process.cwd(), 'data', 'social', 'post-drainer-state.json');

function recordLastPost() {
  try {
    fs.mkdirSync(path.dirname(DRAINER_STATE), { recursive: true });
    fs.writeFileSync(DRAINER_STATE, JSON.stringify({ lastPostedAt: new Date().toISOString() }, null, 1));
  } catch (error) {
    console.error('post-drainer state write failed:', error.message);
  }
}

// Approve: only for platforms with a live API integration and populated
// tokens — everything else (LinkedIn, YouTube package, or a blank-token X
// account) must go through the Copy path instead.
//
// Default mode QUEUES the draft (status: approved) so a review session that
// approves five drafts doesn't fire five tweets simultaneously; the
// social-post-drainer launchd job publishes approved items one at a time
// with spacing. mode:'now' posts immediately (the drainer itself, and the
// card's explicit "Post now" button).
export async function POST(req) {
  try {
    const { filename, mode } = await req.json();
    const safeFilename = safeMdFilename(filename);
    if (!safeFilename) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(SOCIAL_QUEUE_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Draft not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    const record = parseSocialQueueRecord(safeFilename, content, stat);

    if (!API_PLATFORMS.includes(record.platform)) {
      return Response.json({ error: `${record.platform || 'this platform'} has no direct posting API — use Copy instead` }, { status: 400 });
    }
    if (!xAccountReady(record.platform)) {
      return Response.json({ error: `${record.platform} has no tokens in ~/.revivr/social.env yet — use Copy instead` }, { status: 400 });
    }
    if (record.platform === 'x-company' && countGoldenSetEntries() < GOLDEN_SET_MINIMUM) {
      return Response.json({
        error: `Company posting is blocked until the golden set has ${GOLDEN_SET_MINIMUM} approved examples (currently ${countGoldenSetEntries()}) — curate more via "Approve as Golden Example" first.`,
      }, { status: 400 });
    }
    if (!record.copy.trim()) {
      return Response.json({ error: 'Draft has no copy text' }, { status: 400 });
    }
    if (record.media && record.media.split(',').map((s) => s.trim()).filter(Boolean).length) {
      // Deferred to a later session — see Handoff_Log 2026-07-09 (M2): auto-attaching
      // media requires X's separate v1.1 chunked media/upload flow, not built yet.
      return Response.json({ error: 'This draft has media attached — auto-attach isn\'t wired yet. Use Copy, post manually with the media, then Log a publish.' }, { status: 400 });
    }

    // Default: queue for spaced auto-posting. All the validation above has
    // already run, so anything that reaches 'approved' is genuinely postable —
    // problems surface now, at review time, not later inside the drainer.
    if (mode !== 'now') {
      const queued = updateFrontmatterFields(content, { status: 'approved', approved_at: new Date().toISOString() });
      fs.writeFileSync(filePath, queued, 'utf8');
      return Response.json({ success: true, queued: true });
    }

    // repost-comment drafts (from the M3 repost scout) carry the source
    // tweet URL to quote — everything else is a plain, standalone post.
    const quoteTweetId = record.content_type === 'repost-comment' ? tweetIdFromUrl(record.source) : null;
    const result = await postTweet(record.platform, { text: record.copy, quoteTweetId });
    const tweetId = result?.data?.id;
    const username = record.platform === 'x-personal' ? 'EinarJohnson_XR' : 'RevivrStudios';
    const postedUrl = tweetId ? `https://x.com/${username}/status/${tweetId}` : '';
    const today = new Date().toISOString().split('T')[0];

    const updated = updateFrontmatterFields(content, { status: 'posted', posted_url: postedUrl, posted_at: today });
    fs.writeFileSync(filePath, updated, 'utf8');

    appendPublishLogEntry({
      date: today,
      channel: record.platform,
      type: record.content_type || 'wip',
      what: record.title,
      link: postedUrl,
    });
    recordLastPost();

    return Response.json({ success: true, posted_url: postedUrl });
  } catch (error) {
    console.error('Error approving/posting draft:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
