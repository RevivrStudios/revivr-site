import fs from 'fs';
import path from 'path';
import { SOCIAL_QUEUE_DIR, appendPublishLogEntry } from '../../_shared';
import { tweetIdFromUrl, fetchTweetPreview, xAccountReady, postTweet, repostTweet } from '../_x';

const VALID_ACCOUNTS = ['x-personal', 'x-company'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function draftIdNow() {
  const d = new Date();
  return `draft_repost_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// With a comment -> quote-post; without -> plain repost. Either way: writes
// a Social Queue record (source: repost) and appends PUBLISH_LOG, counting
// toward the weekly score like any other publish (Social Plan Phase 2).
export async function POST(req) {
  try {
    const { url, comment, account } = await req.json();
    const tweetId = tweetIdFromUrl(url);
    let linkShare = false;
    if (!tweetId) {
      // Not an X post — treat any http(s) URL as a LINK SHARE: comment + URL
      // as a standalone tweet (X renders the link card). This is how a
      // YouTube video gets posted to X from the ops site.
      try {
        const parsed = new URL((url || '').trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('not http');
        linkShare = true;
      } catch {
        return Response.json({ error: 'Enter an X post URL or any http(s) link to share' }, { status: 400 });
      }
    }
    if (!VALID_ACCOUNTS.includes(account)) {
      return Response.json({ error: 'account must be x-personal or x-company' }, { status: 400 });
    }
    if (!xAccountReady(account)) {
      return Response.json({ error: `${account} has no tokens in ~/.revivr/social.env yet` }, { status: 400 });
    }

    const trimmedComment = (comment || '').trim();
    const source = linkShare ? null : await fetchTweetPreview(tweetId).catch(() => null);
    const authorHandle = source?.author?.username || 'unknown';
    const acctUsername = account === 'x-personal' ? 'EinarJohnson_XR' : 'RevivrStudios';

    let postedUrl;
    let contentType;
    if (linkShare) {
      const cleanUrl = (url || '').trim();
      const text = trimmedComment ? `${trimmedComment}\n\n${cleanUrl}` : cleanUrl;
      const result = await postTweet(account, { text });
      const newId = result?.data?.id;
      postedUrl = newId ? `https://x.com/${acctUsername}/status/${newId}` : '';
      contentType = 'link-share';
    } else if (trimmedComment) {
      const result = await postTweet(account, { text: trimmedComment, quoteTweetId: tweetId });
      const newId = result?.data?.id;
      postedUrl = newId ? `https://x.com/${acctUsername}/status/${newId}` : '';
      contentType = 'repost-comment';
    } else {
      await repostTweet(account, tweetId);
      // Plain retweets don't create a separately addressable tweet in the v2
      // API — the original URL is what's now visible on the account's profile.
      postedUrl = (url || '').trim();
      contentType = 'repost';
    }

    const today = new Date().toISOString().split('T')[0];
    const draftId = draftIdNow();
    const title = linkShare
      ? `Link share — ${new URL(url.trim()).hostname.replace(/^www\./, '')} — ${today}`
      : `Repost — @${authorHandle} — ${today}`;
    const noteContent = `---
draft_id: ${draftId}
platform: ${account}
status: posted
source: ${url}
content_type: ${contentType}
media:
posted_url: ${postedUrl}
posted_at: ${today}
lesson:
---

# ${title}

## Copy
${trimmedComment || '(plain repost — no comment)'}
`;
    fs.mkdirSync(SOCIAL_QUEUE_DIR, { recursive: true });
    fs.writeFileSync(path.join(SOCIAL_QUEUE_DIR, `${draftId}.md`), noteContent, 'utf8');

    appendPublishLogEntry({
      date: today,
      channel: account,
      type: contentType,
      what: title,
      link: postedUrl,
    });

    // Reset the drainer's spacing clock — an immediate quick-post counts as
    // "a post just went out" for the approved-queue gap logic.
    try {
      const statePath = path.join(process.cwd(), 'data', 'social', 'post-drainer-state.json');
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      let state = {};
      try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* first write */ }
      state.lastPostedAt = new Date().toISOString();
      fs.writeFileSync(statePath, JSON.stringify(state, null, 1));
    } catch { /* non-fatal */ }

    return Response.json({ success: true, posted_url: postedUrl });
  } catch (error) {
    console.error('Error posting repost:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
