# Portfolio improvements — local implementation

Date: 5 September 2026. Based on the prior portfolio audit and the user's approval
to implement it. No commit, push, production deployment, DNS change or separate
product-server change was performed.

## Follow-up: Atlas availability restored

After the user repaired the Atlas host, a fresh public check on 5 September 2026
returned HTTP 200 for `https://atlas.santhoshbalaji.cloud/`. The rendered landing
page was visually checked and identifies Atlas's video-production workflow.
This supersedes the initial 502 finding recorded below; it does not certify
authenticated video-generation or rendering workflows.

The homepage Atlas panel and generated project-notes page now include **Visit
Atlas**, with the old unavailable notice removed. `npm run build`, `npm test`,
`git diff --check` and both new desktop/mobile Atlas browser tests passed.
Screenshots of the restored links were inspected. `npm run test:links` now passes
for all three public product destinations (JurisField, Atlas and NammaTN).
These portfolio changes remain local; no push or deployment was performed.

## Implemented

- Preserved the black orbital identity, India-facing Earth, four products and
  automatically started 360-degree 3D. Lower-cost sphere geometry/materials,
  analytical Earth occlusion, per-object shader warm-up with event-loop yields,
  adaptive pixel ratio, cached layout sizes and transform-based hit-target movement.
- Texture loading completes before the first visible 3D frame. Loading previews
  are captures from the real renderer, with separate mobile/desktop assets and
  matching image dimensions. Startup timeout/error recovery remains available;
  aborted startup cannot later replace a fallback unexpectedly.
- Explicit zoom buttons, mobile pause/resume, keyboard rotation/zoom/reset and
  normal wheel scrolling. Offscreen and hidden-tab render scheduling is suspended.
- Paused motion no longer hides newly selected project or career content.
  Reduced-motion/data-saver fallback remains. Automatic product updates no longer
  announce every rotation to screen readers. Ready-state labeling, empty initial
  toast and honest clipboard failure feedback are implemented.
- Navigation now says Work, Experience and Contact. Mobile menu closes on Escape,
  outside click, navigation and desktop breakpoint changes. Meaningful labels and
  supporting text have larger sizes and improved slate-on-black contrast.
- Four product workflow summaries and four standalone project-note pages, with
  problem, intended users, ownership, implementation choices and boundaries. NammaTN
  includes an existing interface preview, explicitly labelled demonstration content.
  No adoption numbers or performance outcomes were invented.
- Expanded career context, restrained contact heading and a mobile email wrap that
  breaks before the domain rather than splitting its final characters.
- MapSmith has an architecture-notes destination. Atlas has an honest unavailable
  state and project-notes destination instead of sending visitors to a known 502.
- Generated social card, ProfilePage/Person JSON-LD, robots.txt and sitemap.xml.
- Content-fingerprinted JS/CSS, lazy Three.js bundle, build manifest/source maps,
  build budgets, browser regression tests and a read-only CI quality workflow.
- No cookies, visitor IDs, browser storage or extra analytics introduced. Existing
  production-hostname/GPC/DNT analytics guards and privacy notice are retained.

## Verification

- `npm run build`: passed; repeat-build hashes were unchanged for the homepage,
  privacy page, build manifest and sampled project page.
- `npm test`: passed. Includes 103,680 ray/sphere camera/orbit configurations and
  asset, privacy, SEO, build-integrity and gzip-budget checks.
- `npm run test:browser`: **10 passed**. Includes 320/390/768 px layouts; all product
  and career tabs while paused; ordinary scrolling; offscreen suspension; mobile
  menu Escape/focus behavior; reduced-motion and data-saver fallbacks; delayed and
  failed texture loads; clipboard rejection; and JavaScript-disabled content.
- A real-time **72-second orbit pass**, with screenshots every 12 seconds,
  validated coherent foreground/rear logo states and visibility of every product.
  Keyboard rotation beyond a complete turn and reset were also exercised.
- Screenshots of all four products, career, contact, desktop/mobile hero and a
  mobile project-note page were reviewed visually. That pass caught and corrected
  a leftover desktop grid-row gap and cramped product labels.
- `node --check script.js`, `node --check three-universe.js`, `git diff --check`: passed.
- `npm audit`: **0 advisories**, including development dependencies at the time of testing.
- Live destination recheck: JurisField **200**, NammaTN **200** after its welcome
  redirect, Atlas **502**. Link checker correctly returns a failure for the outage.

## Local performance — not a production score

Lighthouse 13.4.1, isolated headless Google Chrome. The unchanged Git commit and the
updated site were served with the same localhost gzip server and 10-minute cache
policy. This is more representative than Python's uncompressed development server,
but it is not Google's production infrastructure, a physical Android device or
field-user INP data.

| Local mobile measurement | Committed baseline | Optimized runs |
| --- | ---: | ---: |
| Performance | 95 | 94–96 |
| Accessibility | 97 | 100 |
| Total blocking time | 250 ms | 90–150 ms |
| First contentful paint | 0.7 s | 1.4 s |
| Largest contentful paint | 1.6 s | 2.7 s |
| Layout shift | 0 | 0 |

The smaller tasks improved blocking time. The stable, real-renderer preview became
the measured LCP element and the larger exact inline stylesheet increased first
paint timing in this local comparison. The overall mobile score is broadly similar,
not a demonstrated jump to 100. Do not compare this directly with the prior live
PageSpeed score of 64 or claim that score has been fixed in production.

The final desktop run scored **100 performance, 100 accessibility, 100 best
practices, 100 SEO**; FCP 0.3 s, LCP 0.6 s, TBT 30 ms, CLS 0.001. Repeated lab
results vary. Automatic 3D was preserved; there are no Lighthouse/user-agent gates.

The exact final mobile build scored **95 performance, 100 accessibility, 100 best
practices, 100 SEO**; FCP 1.4 s, LCP 2.7 s, TBT 110 ms, CLS 0, Speed Index 1.4 s
(`local-lighthouse-release-mobile`). Build entry: `site-AIG6XFWL.js`; CSS fingerprint:
`site-c75a910b90fa.css`. The preview server is localhost-only and compresses textual
assets; it refuses dotfile and node_modules paths.

Raw local reports are retained in `audits/local-lighthouse-*.report.html` and JSON
(ignored by Git). Selected visual evidence is in `audits/screenshots/`.

## Remaining external work / limits

1. Atlas availability is resolved by the follow-up above; recheck public links at release time.
2. Configure and verify CSP/framing/HSTS/permissions headers and immutable caching
   at a supported edge. `DEPLOYMENT-HARDENING.md` explains this; a GitHub Pages
   `_headers` file or a meta tag would not implement those response headers.
3. Production deployment and a fresh production PageSpeed test need release approval.
4. Physical iPhone/Android profiling, full screen-reader testing, security testing
   and field-user measurements are not completed by browser emulation.
5. No recurring monitor was created. `npm run test:links` is an explicit, read-only
   health check, and the new CI workflow will run only after it is pushed.
