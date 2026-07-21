// Review intelligence for ASO — pure analysis over the public App Store review
// feed we already fetch (app/lib/appStoreReviews.js). No external service:
// rating distribution + trend, and theme/keyword mining that ties each recurring
// term to the sentiment of the reviews that mention it. The words happy users
// use are keyword candidates; the words unhappy users use are the fix-list.

const STOPWORDS = new Set(
  ('a an the and or but if then else when at by for with about against between into through during before after ' +
   'above below to from up down in out on off over under again further once here there all any both each few more ' +
   'most other some such no nor not only own same so than too very can will just don should now this that these those ' +
   'i me my we our you your he she it they them his her its their what which who whom is are was were be been being have ' +
   'has had do does did doing would could should of as it\'s im ive app apps use using used get got really would like ' +
   'one also even much many still way thing things great good really please would love app’s dont doesnt cant')
    .split(/\s+/)
);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function analyzeReviews(reviews) {
  const items = Array.isArray(reviews) ? reviews.filter((r) => r && r.rating) : [];
  const count = items.length;
  if (count === 0) return { count: 0 };

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  items.forEach((r) => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
  const avgRating = round1(items.reduce((s, r) => s + r.rating, 0) / count);

  // Per-version average (rating trend across releases).
  const versionMap = {};
  items.forEach((r) => {
    const v = r.version || 'unknown';
    (versionMap[v] ||= []).push(r.rating);
  });
  const byVersion = Object.entries(versionMap)
    .map(([version, ratings]) => ({ version, count: ratings.length, avg: round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) }))
    .sort((a, b) => (a.version < b.version ? 1 : -1))
    .slice(0, 6);

  // Theme mining: term -> {count, ratingSum} across reviews that mention it.
  const terms = {};
  items.forEach((r) => {
    const seen = new Set(tokenize(`${r.title} ${r.content}`));
    seen.forEach((t) => {
      (terms[t] ||= { count: 0, ratingSum: 0 });
      terms[t].count += 1;
      terms[t].ratingSum += r.rating;
    });
  });

  const themes = Object.entries(terms)
    .filter(([, v]) => v.count >= 2) // recurring only
    .map(([term, v]) => ({ term, count: v.count, avg: round1(v.ratingSum / v.count) }))
    .sort((a, b) => b.count - a.count);

  const loved = themes.filter((t) => t.avg >= 4).slice(0, 8);
  const painPoints = themes.filter((t) => t.avg <= 2.5).sort((a, b) => a.avg - b.avg || b.count - a.count).slice(0, 8);

  // Keyword candidates: frequent, positively-associated terms — what happy
  // users actually call the app. Good ASO keyword seeds.
  const keywordCandidates = themes
    .filter((t) => t.avg >= 3.5)
    .slice(0, 12)
    .map((t) => t.term);

  const sample = (predicate) => items.filter(predicate).slice(0, 3).map((r) => ({ title: r.title, rating: r.rating, content: (r.content || '').slice(0, 240), version: r.version }));

  return {
    count,
    avgRating,
    distribution,
    byVersion,
    loved,
    painPoints,
    keywordCandidates,
    positiveSamples: sample((r) => r.rating >= 4),
    negativeSamples: sample((r) => r.rating <= 2),
  };
}
