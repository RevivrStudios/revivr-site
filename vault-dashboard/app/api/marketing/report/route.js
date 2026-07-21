import fs from 'fs';
import path from 'path';
import { MARKETING_VAULT_ROOT, noStoreHeaders } from '../_shared';

const METRICS_DIR = path.join(MARKETING_VAULT_ROOT, '06 Metrics');
const CHANNELS = ['x-personal', 'x-company', 'linkedin', 'youtube-package'];

function weekKey(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function parseSnapshot(content) {
  const rowRegex = /^\|\s*(https?:\/\/\S+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.*?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*$/gm;
  return [...content.matchAll(rowRegex)].map((m) => ({
    link: m[1], postedDate: m[2], type: m[3],
    likes: Number(m[4]), retweets: Number(m[5]), replies: Number(m[6]), quotes: Number(m[7]), impressions: Number(m[8]),
  }));
}

export async function GET() {
  const channels = {};
  let latestOverall = null;

  for (const channel of CHANNELS) {
    const dir = path.join(METRICS_DIR, channel);
    if (!fs.existsSync(dir)) {
      channels[channel] = { posts: [], trend: [], byType: {}, hasData: false };
      continue;
    }
    const snapshotFiles = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
    if (snapshotFiles.length === 0) {
      channels[channel] = { posts: [], trend: [], byType: {}, hasData: false };
      continue;
    }

    // Trend: total impressions per snapshot day, bucketed into weeks.
    const weekTotals = {};
    snapshotFiles.forEach((file) => {
      const snapshotDate = file.replace('.md', '');
      const rows = parseSnapshot(fs.readFileSync(path.join(dir, file), 'utf8'));
      const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
      const wk = weekKey(snapshotDate);
      // Keep the LATEST snapshot's total within each week (a snapshot is
      // cumulative-as-of-that-day, not a daily delta).
      if (!weekTotals[wk] || snapshotDate > weekTotals[wk].asOf) {
        weekTotals[wk] = { asOf: snapshotDate, impressions: totalImpressions };
      }
    });
    const trend = Object.entries(weekTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({ week, impressions: v.impressions }));

    // Latest snapshot = most current per-post metrics.
    const latestFile = snapshotFiles[snapshotFiles.length - 1];
    const latestRows = parseSnapshot(fs.readFileSync(path.join(dir, latestFile), 'utf8'));
    if (!latestOverall || latestFile > latestOverall) latestOverall = latestFile;

    const byType = {};
    latestRows.forEach((r) => {
      const t = r.type || 'untyped';
      if (!byType[t]) byType[t] = { posts: 0, likes: 0, retweets: 0, replies: 0, impressions: 0 };
      byType[t].posts += 1;
      byType[t].likes += r.likes;
      byType[t].retweets += r.retweets;
      byType[t].replies += r.replies;
      byType[t].impressions += r.impressions;
    });

    // Metrics triage (Phase 7): reach vs resonance problem, computed from
    // what's actually collected. NOT computing a "conversion problem" label —
    // that needs follower-count snapshots and link-click tracking, neither
    // of which any phase so far has built; a fabricated label would be worse
    // than an honest gap (disclosed in the plan file, not silently skipped).
    let triage = null;
    if (trend.length >= 2) {
      const currentWeek = trend[trend.length - 1];
      const priorWeeks = trend.slice(0, -1).slice(-4);
      const median = [...priorWeeks.map((w) => w.impressions)].sort((a, b) => a - b)[Math.floor(priorWeeks.length / 2)] || 0;
      const totalEngagement = latestRows.reduce((s, r) => s + r.likes + r.retweets + r.replies, 0);
      const totalImpressions = latestRows.reduce((s, r) => s + r.impressions, 0);
      const engagementRate = totalImpressions > 0 ? totalEngagement / totalImpressions : 0;
      if (median > 0 && currentWeek.impressions < median * 0.7) {
        triage = { label: 'reach problem', detail: `This week's impressions (${currentWeek.impressions}) are well below the trailing 4-week median (${median}).` };
      } else if (totalImpressions > 0 && engagementRate < 0.02) {
        triage = { label: 'resonance problem', detail: `Impressions are fine but engagement rate is low (${(engagementRate * 100).toFixed(1)}%).` };
      }
    }

    channels[channel] = {
      hasData: true,
      asOf: latestFile.replace('.md', ''),
      posts: latestRows.sort((a, b) => b.postedDate.localeCompare(a.postedDate)),
      trend,
      byType,
      triage,
    };
  }

  return Response.json({ channels, asOf: latestOverall ? latestOverall.replace('.md', '') : null }, { headers: noStoreHeaders });
}
