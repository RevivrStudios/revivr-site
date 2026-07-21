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
    if (!tweetId) {
      return Response.json({ error: 'Could not find a tweet/post ID in that URL' }, { status: 400 });
    }
    if (!VALID_ACCOUNTS.includes(account)) {
      return Response.json({ error: 'account must be x-personal or x-company' }, { status: 400 });
    }
    if (!xAccountReady(account)) {
      return Response.json({ error: `${account} has no tokens in ~/.revivr/social.env yet` }, { status: 400 });
    }

    const trimmedComment = (comment || '').trim();
    const source = await fetchTweetPreview(tweetId).catch(() => null);
    const authorHandle = source?.author?.username || 'unknown';
    const acctUsername = account === 'x-personal' ? 'EinarJohnson_XR' : 'RevivrStudios';

    let postedUrl;
    let contentType;
    if (trimmedComment) {
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
    const title = `Repost — @${authorHandle} — ${today}`;
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

    return Response.json({ success: true, posted_url: postedUrl });
  } catch (error) {
    console.error('Error posting repost:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
