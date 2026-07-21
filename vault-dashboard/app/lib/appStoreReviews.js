import { APP_STORE_COUNTRY } from '@/app/lib/config';

// App Store review monitoring via Apple's public per-app customer-review RSS
// feed — no App Store Connect credentials required. Salvaged (2026-07-13)
// from the retired Quell rebuild (app/lib/marketing.js) during the marketing
// de-dup; the vault-backed marketing glass (app/api/marketing/_shared.js) is
// the source of truth for everything else. Wired into the apps detail page in
// Phase 2.
export async function fetchReviews(appStoreId, country = APP_STORE_COUNTRY) {
  const id = String(appStoreId).replace(/\D/g, '');
  if (!id) throw new Error('App needs a numeric App Store ID to fetch reviews.');
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${id}/sortBy=mostRecent/json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`App Store feed returned HTTP ${res.status}`);
  const doc = await res.json();
  const entries = Array.isArray(doc?.feed?.entry) ? doc.feed.entry : [];
  // First entry is app metadata when present; review entries carry im:rating.
  return entries
    .filter((e) => e['im:rating'])
    .map((e) => ({
      title: e.title?.label || '',
      rating: parseInt(e['im:rating']?.label || '0', 10),
      author: e.author?.name?.label || '',
      version: e['im:version']?.label || '',
      content: (e.content?.label || '').slice(0, 800),
      updated: e.updated?.label || '',
    }));
}
