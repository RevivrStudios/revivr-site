# Growth power features — verification

Branch `growth-power-features`. Four features, verified against a production
build (`next start`) with the real Anthropic key + the authenticated `asc` CLI.

## Results

- **`npm run build`** — succeeds; new routes registered:
  `/api/business/vitals(/sync)`, `/api/marketing/social/performance(/sync)`,
  `/api/marketing/apps/[slug]/aso`, `/api/actions/quinn(/status)`.
- **Business Vitals** — `/api/business/vitals/sync` runs the `asc` CLI headless,
  enumerates all 6 apps, and (with no vendor number / no provisioned reports)
  returns `overall: setup`. The home block renders the guided two-path setup
  card. → `home-business-vitals.png`
- **Quinn actions** — clicking "Ask Quinn to fix" on a live red health check
  produced a real, 2,645-char, tool-using diagnosis: it checked the failure
  registry + Handoff Log + live heartbeats, concluded "not a defect,
  expected-missing," and gave concrete shell fix steps. Not a canned reply.
  → `quinn-action-reply.png`
- **Marketing loop** — `/performance/sync` runs (X bearer present); 0 historical
  X-linked posts in the publish log to score yet, so TopPosts shows its "sync to
  score" state. The weekly score route now carries an `outcome` block from the
  cache. → `social-top-posts.png`
- **ASO** — live apps have no public reviews yet, so the panel shows its honest
  "no reviews to analyze yet" state (`app-aso.png`). The analysis logic is proven
  correct on synthetic reviews: v1.2 avg 4.3 vs v1.1 avg 1.5 (version trend),
  loved = gaze/tracking/accessibility, pain = crash/launch/bug, keyword seeds
  extracted.
- **Console/page errors** — none across the whole run.

## Data readiness (not code — external prerequisites)

- **Business Vitals numbers**: set `ASC_VENDOR_NUMBER` in `~/.revivr-dashboard.env`
  for instant Sales & Trends, and/or click "Enable analytics reporting" once
  (Apple generates the funnel over ~24–48h).
- **Top posts**: populate once published X posts with links accumulate in
  `PUBLISH_LOG.md` and a performance sync runs.
- **ASO**: populates as apps accrue public App Store reviews.
