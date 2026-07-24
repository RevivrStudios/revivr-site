import { tweetIdFromUrl, fetchTweetPreview } from '../../_x';

// Read-only preview via Bearer token — lets the Quick Repost box show the
// source before Einar confirms, so a mistyped URL can't get quoted/reposted
// blind (Social Plan Phase 2). Two shapes:
//   X status URL  -> kind 'tweet'  (author/text/metrics via API)
//   any other URL -> kind 'link'   (oEmbed title for YouTube, else page <title>)
// The link path is what makes "share this YouTube video to X with a comment"
// possible from the ops site — previously any non-X URL was a hard error.

function isHttpUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchLinkPreview(url) {
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  // YouTube supports public oEmbed — proper titles with no API key.
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(new URL(url).hostname)) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const d = await res.json();
        return { kind: 'link', title: d.title, author: d.author_name, site: 'YouTube', url };
      }
    } catch { /* fall through to generic */ }
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RevivrOperationsDashboard/1.0 (+link-preview)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = (await res.text()).slice(0, 30000);
    const m = html.match(/<title[^>]*>\s*([^<]{1,200})/i);
    return { kind: 'link', title: m ? m[1].trim() : url, site: hostname, url };
  } catch {
    return { kind: 'link', title: url, site: hostname, url };
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = (searchParams.get('url') || '').trim();
  const tweetId = tweetIdFromUrl(url);
  if (tweetId) {
    try {
      const preview = await fetchTweetPreview(tweetId);
      return Response.json({ preview: { kind: 'tweet', ...preview } });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
  }
  if (isHttpUrl(url)) {
    return Response.json({ preview: await fetchLinkPreview(url) });
  }
  return Response.json({ error: 'Enter an X post URL or any http(s) link to share' }, { status: 400 });
}
