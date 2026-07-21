import { parsePublishLog, parseSocialTargets, listSocialQueueDrafts, listDrops, noStoreHeaders } from '../../_shared';
import { readPerfCache } from '@/app/lib/socialPerformance';

const CHANNELS = ['x-personal', 'x-company', 'linkedin', 'youtube-package'];

// Monday 00:00 UTC on or before `date`.
function weekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekKey(date) {
  return weekStart(date).toISOString().split('T')[0];
}

// Phase 6: any drop older than 2h with zero Social Queue drafts referencing
// it. Drop IDs encode their own creation timestamp (drop_YYYYMMDDHHmmss),
// used directly rather than the coarser day-only `date` frontmatter field.
function parseDropTimestamp(dropId) {
  const m = dropId.match(/^drop_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

export async function GET() {
  const targets = parseSocialTargets();
  const totalTarget = Object.values(targets).reduce((a, b) => a + b, 0);
  const publishLog = parsePublishLog();
  const drafts = listSocialQueueDrafts();
  const now = new Date();
  const thisWeekKey = weekKey(now);

  // This week's published count, per channel.
  const thisWeekEntries = publishLog.entries.filter((e) => weekKey(e.date) === thisWeekKey);
  const perChannel = {};
  CHANNELS.forEach((c) => {
    perChannel[c] = {
      target: targets[c] ?? 0,
      published: thisWeekEntries.filter((e) => e.channel === c).length,
    };
  });
  const totalPublished = thisWeekEntries.length;

  // Drafted-vs-published split this week (drafts identified by file mtime,
  // the only "when was this touched" signal a queue record carries).
  const draftedThisWeek = drafts.filter((d) => weekKey(d.modifiedAt) === thisWeekKey && (d.status === 'drafted' || d.status === 'approved')).length;

  // Week-over-week streak: consecutive COMPLETE past weeks (excludes the
  // current, still-accumulating week) meeting or beating the total target.
  const weekTotals = {};
  publishLog.entries.forEach((e) => {
    const k = weekKey(e.date);
    weekTotals[k] = (weekTotals[k] || 0) + 1;
  });
  let streak = 0;
  let cursor = weekStart(now);
  cursor.setUTCDate(cursor.getUTCDate() - 7); // start from the last COMPLETE week
  while ((weekTotals[cursor.toISOString().split('T')[0]] || 0) >= totalTarget && totalTarget > 0) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  // Dead-man watchdogs (Phase 6): per channel, drafts and posts in the last
  // 7 days. Red (zero) is the whole point — the curator bot died silently
  // for 5 months; this must be visible, not assumed.
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const watchdogs = CHANNELS.map((c) => {
    const recentDrafts = drafts.filter((d) => d.platform === c && new Date(d.modifiedAt) >= sevenDaysAgo).length;
    const recentPosts = publishLog.entries.filter((e) => e.channel === c && new Date(e.date) >= sevenDaysAgo).length;
    return { channel: c, draftsLast7d: recentDrafts, postsLast7d: recentPosts, red: recentDrafts === 0 && recentPosts === 0 };
  });

  // Drafting SLA: any drop >2h old with no referencing Social Queue draft.
  const draftedSources = new Set(drafts.map((d) => d.source));
  const slaFlags = listDrops()
    .filter((drop) => !draftedSources.has(drop.drop_id) && !draftedSources.has(drop.folder))
    .map((drop) => {
      const ts = parseDropTimestamp(drop.drop_id);
      const ageHours = ts ? (now - ts) / (1000 * 60 * 60) : null;
      return { drop_id: drop.drop_id, title: drop.title, ageHours: ageHours !== null ? Math.round(ageHours * 10) / 10 : null };
    })
    .filter((f) => f.ageHours === null || f.ageHours > 2);

  // Outcome layer (2026-07-16): cadence answers "did I post?" — this answers
  // "did it land?". Read from the social-performance cache (no live fetch here);
  // null until the performance sync has run at least once.
  const perf = await readPerfCache();
  const outcome = perf?.summary
    ? {
        weekEngagement: perf.summary.weekEngagement,
        weekPosts: perf.summary.weekPosts,
        avgScore: perf.summary.avgScore,
        best: perf.summary.best
          ? { score: perf.summary.best.score, what: perf.summary.best.what, link: perf.summary.best.link, metrics: perf.summary.best.metrics }
          : null,
        syncedAt: perf.generatedAt,
      }
    : null;

  return Response.json(
    {
      week: { total: totalPublished, target: totalTarget, perChannel, draftedThisWeek },
      streak,
      watchdogs,
      slaFlags,
      outcome,
    },
    { headers: noStoreHeaders }
  );
}
