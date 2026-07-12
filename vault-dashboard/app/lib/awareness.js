import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import Anthropic from '@anthropic-ai/sdk';
import {
  FEEDS_CONFIG_FILE,
  FEED_ITEMS_DIR,
  BRIEFINGS_DIR,
  AWARENESS_ARCHIVE_DIR,
  ANTHROPIC_API_KEY,
  BRIEFING_MODEL,
} from '@/app/lib/config';
import { ensureDir } from '@/app/lib/vaultFs';
import { logAction } from '@/app/lib/actionlog';

// Awareness layer: pull RSS/Atom feeds across the domains Revivr tracks
// (AI, healthcare, robotics, Apple/visionOS), keep the raw items, and distill
// an AI briefing that is also archived into the vault so awareness compounds
// into agent knowledge.

export const DEFAULT_FEEDS = [
  { id: 'apple-dev', name: 'Apple Developer News', category: 'apple', url: 'https://developer.apple.com/news/rss/news.rss' },
  { id: 'ieee-ai', name: 'IEEE Spectrum — AI', category: 'ai', url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss' },
  { id: 'techcrunch-ai', name: 'TechCrunch — AI', category: 'ai', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'arxiv-csai', name: 'arXiv cs.AI (research)', category: 'ai', url: 'https://rss.arxiv.org/rss/cs.AI' },
  { id: 'ieee-robotics', name: 'IEEE Spectrum — Robotics', category: 'robotics', url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss' },
  { id: 'statnews-health', name: 'STAT News — Health Tech', category: 'healthcare', url: 'https://www.statnews.com/category/health-tech/feed/' },
  { id: 'medgadget', name: 'Medgadget', category: 'healthcare', url: 'https://www.medgadget.com/feed' },
];

export async function loadFeedsConfig() {
  try {
    return JSON.parse(await readFile(FEEDS_CONFIG_FILE, 'utf-8'));
  } catch {
    return DEFAULT_FEEDS;
  }
}

export async function saveFeedsConfig(feeds) {
  await ensureDir(path.dirname(FEEDS_CONFIG_FILE));
  await writeFile(FEEDS_CONFIG_FILE, JSON.stringify(feeds, null, 2), 'utf-8');
}

function asArray(x) {
  return Array.isArray(x) ? x : x ? [x] : [];
}

function textOf(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node['#text'] != null) return String(node['#text']);
  return '';
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Parse both RSS 2.0 (<rss><channel><item>) and Atom (<feed><entry>).
export function parseFeedXml(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xml);
  const items = [];

  const rssItems = asArray(doc?.rss?.channel?.item);
  for (const it of rssItems) {
    items.push({
      title: stripHtml(textOf(it.title)),
      link: textOf(it.link),
      published: textOf(it.pubDate) || textOf(it['dc:date']),
      summary: stripHtml(textOf(it.description)).slice(0, 400),
    });
  }

  const atomEntries = asArray(doc?.feed?.entry);
  for (const it of atomEntries) {
    const links = asArray(it.link);
    const alt = links.find((l) => l['@_rel'] === 'alternate') || links[0];
    items.push({
      title: stripHtml(textOf(it.title)),
      link: alt?.['@_href'] || textOf(it.link),
      published: textOf(it.updated) || textOf(it.published),
      summary: stripHtml(textOf(it.summary) || textOf(it.content)).slice(0, 400),
    });
  }

  return items.filter((i) => i.title);
}

export async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'RevivrOperationsDashboard/3.0 (+awareness)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = parseFeedXml(await res.text()).slice(0, 25);
  return items.map((i) => ({ ...i, feedId: feed.id, feedName: feed.name, category: feed.category }));
}

export async function refreshAllFeeds() {
  const feeds = await loadFeedsConfig();
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  const items = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else errors.push({ feed: feeds[i].id, error: r.reason.message });
  });

  await ensureDir(FEED_ITEMS_DIR);
  const snapshot = { fetchedAt: new Date().toISOString(), items, errors };
  await writeFile(path.join(FEED_ITEMS_DIR, 'latest.json'), JSON.stringify(snapshot, null, 2), 'utf-8');

  await logAction({
    source: 'awareness',
    action: 'refresh-feeds',
    label: `Fetched ${items.length} items from ${feeds.length - errors.length}/${feeds.length} feeds`,
    success: errors.length < feeds.length,
    detail: errors.map((e) => `${e.feed}: ${e.error}`).join('; '),
  });

  return snapshot;
}

export async function loadLatestItems() {
  try {
    return JSON.parse(await readFile(path.join(FEED_ITEMS_DIR, 'latest.json'), 'utf-8'));
  } catch {
    return { fetchedAt: null, items: [], errors: [] };
  }
}

export async function generateBriefing(snapshot) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured — cannot generate a briefing (raw feed items are still available).');
  }
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const byCategory = {};
  for (const item of snapshot.items) {
    (byCategory[item.category] ||= []).push(`- [${item.feedName}] ${item.title} — ${item.summary || '(no summary)'} (${item.link})`);
  }
  const digest = Object.entries(byCategory)
    .map(([cat, lines]) => `## ${cat}\n${lines.slice(0, 20).join('\n')}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: BRIEFING_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: `You write the daily awareness briefing for Revivr Studios — a solo visionOS/spatial-computing app studio whose strategic radar covers AI, healthcare technology, robotics, and the Apple developer ecosystem. Write a concise markdown briefing from the feed items provided:
- Start with "# Revivr Awareness Briefing" and a 3-5 bullet "Top signals" section: the items most likely to matter to a visionOS app studio (new Apple SDKs/policies, AI capabilities usable in app development or agent pipelines, healthcare/robotics developments adjacent to Revivr's app ideas).
- Then one short section per domain (Apple, AI, Healthcare, Robotics) with the notable items and one-line "why it matters to Revivr" notes. Include the source links.
- Skip low-signal items entirely. Plain, direct language. End with an "Action candidates" list only if something genuinely warrants action.`,
    messages: [{ role: 'user', content: `Feed items fetched ${snapshot.fetchedAt}:\n\n${digest}` }],
  });

  if (response.stop_reason === 'refusal') throw new Error('Briefing generation was declined.');
  const briefing = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');

  const date = new Date().toISOString().slice(0, 10);
  await ensureDir(BRIEFINGS_DIR);
  const filename = `${date}-briefing.md`;
  await writeFile(path.join(BRIEFINGS_DIR, filename), briefing, 'utf-8');

  // Archive into the vault so briefings become part of long-term agent knowledge.
  try {
    await ensureDir(AWARENESS_ARCHIVE_DIR);
    await writeFile(path.join(AWARENESS_ARCHIVE_DIR, filename), briefing, 'utf-8');
  } catch (err) {
    console.warn('[Awareness] vault archive failed:', err.message);
  }

  await logAction({ source: 'awareness', action: 'generate-briefing', label: `Briefing ${filename}`, success: true });
  return { filename, briefing };
}

export async function listBriefings() {
  try {
    const files = (await readdir(BRIEFINGS_DIR)).filter((f) => f.endsWith('.md')).sort().reverse();
    return files;
  } catch {
    return [];
  }
}

export async function readBriefing(filename) {
  try {
    return await readFile(path.join(BRIEFINGS_DIR, path.basename(filename)), 'utf-8');
  } catch {
    return null;
  }
}
