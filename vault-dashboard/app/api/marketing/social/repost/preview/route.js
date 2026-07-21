import { tweetIdFromUrl, fetchTweetPreview } from '../../_x';

// Read-only preview via Bearer token — lets the Quick Repost box show the
// source post before Einar confirms, so a mistyped URL can't get
// quoted/reposted blind (Social Plan Phase 2).
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url') || '';
  const tweetId = tweetIdFromUrl(url);
  if (!tweetId) {
    return Response.json({ error: 'Could not find a tweet/post ID in that URL' }, { status: 400 });
  }
  try {
    const preview = await fetchTweetPreview(tweetId);
    return Response.json({ preview });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
