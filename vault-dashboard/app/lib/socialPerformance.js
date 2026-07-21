import fs from 'fs/promises';
import path from 'path';
import { SOCIAL_PERF_CACHE } from '@/app/lib/config';
import { parsePublishLog } from '@/app/api/marketing/_shared';
import { tweetIdFromUrl, fetchTweetPreview } from '@/app/api/marketing/social/_x';
import { hasSocialToken } from '@/app/api/marketing/social/_env';

// The marketing OUTCOME loop: the pipeline already knows what you *posted*
// (PUBLISH_LOG.md). This pulls what each post *did* — X public_metrics — so
// "did it land" can feed back into "what to make next." Bearer reads are
// rate-limited and per-post, so results are cached; the sync route refreshes.

const MAX_POSTS = 40; // cap Bearer lookups per sync (rate-limit friendly)

// Weighted so a reply/retweet (someone acted) counts more than a passive
// impression. Impressions folded in lightly when X returns them.
export function engagementScore(m) {
  if (!m) return 0;
  const likes = m.like_count || 0;
  const rts = m.retweet_count || 0;
  const replies = m.reply_count || 0;
  const quotes = m.quote_count || 0;
  const impressions = m.impression_count || 0;
  return likes * 1 + rts * 3 + replies * 2 + quotes * 2 + impressions * 0.02;
}

function isThisWeek(dateStr, now = new Date()) {
  const d = new Date(dateStr);
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < 7;
}

// Build the performance dataset from the publish log. Only X posts carry a
// resolvable tweet id; other channels are skipped (no metrics source yet).
export async function computePerformance() {
  const hasBearer = hasSocialToken('X_BEARER_TOKEN');
  if (!hasBearer) {
    return { status: 'no-token', generatedAt: new Date().toISOString(), posts: [], summary: null };
  }

  const { entries } = parsePublishLog();
  const candidates = [];
  for (const e of entries) {
    const tweetId = tweetIdFromUrl(e.link);
    if (!tweetId) continue;
    candidates.push({ ...e, tweetId });
    if (candidates.length >= MAX_POSTS) break; // entries are newest-first
  }

  const posts = [];
  for (const c of candidates) {
    try {
      const t = await fetchTweetPreview(c.tweetId);
      posts.push({
        date: c.date,
        channel: c.channel,
        what: c.what,
        link: c.link,
        tweetId: c.tweetId,
        text: t.text || c.what,
        metrics: t.metrics || null,
        score: Math.round(engagementScore(t.metrics)),
      });
    } catch (err) {
      posts.push({ date: c.date, channel: c.channel, what: c.what, link: c.link, tweetId: c.tweetId, metrics: null, score: 0, error: err.message });
    }
  }

  posts.sort((a, b) => b.score - a.score);

  const withMetrics = posts.filter((p) => p.metrics);
  const weekPosts = withMetrics.filter((p) => isThisWeek(p.date));
  const summary = {
    counted: withMetrics.length,
    weekEngagement: weekPosts.reduce((s, p) => s + p.score, 0),
    weekPosts: weekPosts.length,
    best: withMetrics[0] || null,
    avgScore: withMetrics.length ? Math.round(withMetrics.reduce((s, p) => s + p.score, 0) / withMetrics.length) : 0,
  };

  return { status: 'ok', generatedAt: new Date().toISOString(), posts, summary };
}

export async function readPerfCache() {
  try {
    return JSON.parse(await fs.readFile(SOCIAL_PERF_CACHE, 'utf8'));
  } catch {
    return null;
  }
}

export async function writePerfCache(data) {
  await fs.mkdir(path.dirname(SOCIAL_PERF_CACHE), { recursive: true });
  await fs.writeFile(SOCIAL_PERF_CACHE, JSON.stringify(data, null, 2), 'utf8');
}
