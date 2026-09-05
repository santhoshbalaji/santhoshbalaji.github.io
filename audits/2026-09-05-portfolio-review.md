# Portfolio review — 5 September 2026

## Overall assessment

Keep the orbital identity. The portfolio has a distinctive, coherent visual concept, a restrained personal portrait, real products, and functioning 3D interaction. The biggest gains now come from reliability, readable typography, demonstrable product work, and lower rendering cost—not another theme replacement.

The current experience invests much more space in the presentation of the products than in evidence of what they do. A visitor can recognize the brand, but cannot yet evaluate the quality of the applications or the engineering decisions behind them.

This was an analysis-only audit. No implementation, deployment, or account settings were changed.

## Scope and evidence

- Live site: https://santhoshbalaji.cloud/ and its privacy page.
- Rendered desktop review at 1440 × 900; responsive review at 390 × 844 and 320 × 740.
- Tested navigation, all four product tabs, career tabs, tab arrow-key navigation, mobile menu, planet-to-project activation, drag rotation, keyboard rotation, zoom/reset controls, pause/resume, copy-email feedback, and reduced-motion fallback.
- Inspected screenshots at the hero, work, career, and contact sections. Responsive screenshot scaling initially required correcting the test setup; findings below use the verified viewport/reloaded captures, not the malformed intermediate captures.
- Checked public product destinations, response headers, metadata, analytics implementation, and the local verification suite.
- Source checkout: `1aefd39`. The live page currently loads `script.min.js?v=5` and `three-universe.js?v=37`.
- Ran a fresh Google PageSpeed Insights analysis. [Saved mobile report](https://pagespeed.web.dev/analysis/https-santhoshbalaji-cloud/8oeo7v5q4l?form_factor=mobile).

Limitations: responsive browser emulation is not a physical iPhone/Android test. No full screen-reader session, security penetration test, continuous orbit-cycle certification, or field-user study was performed. The dedicated local performance-trace tool was unavailable. PageSpeed's desktop run failed with `RPC::DEADLINE_EXCEEDED`, so there is no fresh desktop score to report.

## Fresh performance results

PageSpeed mobile, Lighthouse 13.4.1, emulated Moto G Power, slow 4G, initial page load, report timestamp 5 September 2026, 07:28 GMT+5:30:

| Metric | Result |
| --- | ---: |
| Performance | 64 / 100 |
| Accessibility | 97 / 100 |
| Best practices | 100 / 100 |
| SEO | 100 / 100 |
| First contentful paint | 0.8 s |
| Largest contentful paint | 0.8 s |
| Total blocking time | 12,730 ms |
| Cumulative layout shift | 0 |
| Speed Index | 6.3 s |

The report has no CrUX field-user data. These are single-run lab measurements, not a promise about every device or a field INP measurement.

The principal problem is work after the first paint. PageSpeed attributes approximately 39.5 seconds of total CPU time to `three-universe.js?v=37`; only about 1.84 seconds of that is script evaluation. The main-thread breakdown contains 37.75 seconds categorized as “Other.” This warrants tracing the WebGL/rendering path on real devices; the report alone cannot distinguish driver/shader work from every other native operation.

Other findings: 20 long main-thread tasks, 17 non-composited animated elements, approximately 36 ms of attributed forced reflow, and estimated cache savings of 583 KiB. First-party static assets have 10-minute caching. The report lists repeated Earth-texture/logo entries; confirm whether their request modes cause redundant transfers before changing asset loading.

Recommended performance work, in order:

1. Profile automatic 3D startup and steady-state rendering on a midrange Android device; compare CPU time, frame pacing, and interaction latency with the lab result.
2. Preserve automatic 3D and its composition, but start with a lower-cost rendering tier. Adapt pixel ratio, geometry, material complexity, and render frequency to measured performance. Avoid switching the default experience back to a click-to-load 2D substitute.
3. Reduce per-frame raycasting cost: consider analytical sphere occlusion for spherical bodies; update DOM positions only when needed and keep layout reads separate from writes. Verify that logo visibility remains correct at Earth crossings.
4. Keep offscreen/hidden-tab rendering suspended; test these existing safeguards behaviorally. Tune visibility thresholds so mobile visitors are not paying the full 3D cost while reading above it.
5. Make asset requests consistent, then use content-fingerprinted static assets and longer immutable caching where the hosting/CDN supports it. Keep HTML on a short cache policy.
6. Add repeatable performance budgets and compare multiple runs. A score of 100 is a useful aspiration, not a reliable guarantee; responsive input and a stable automatic 3D experience are the acceptance criteria.

[Google's Core Web Vitals guidance](https://web.dev/articles/vitals) distinguishes lab checks from field measurements and recommends LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1 at the 75th percentile.

## Priority 1 — confirmed problems to fix first

### 1. Pausing motion makes newly selected product panels invisible

**Reproduction:** Pause motion in the desktop header, navigate to Missions, then choose Atlas, NammaTN, or MapSmith. The selected panel remains in the DOM but has computed opacity `0` and animation play state `paused`. The project area is visibly blank. Resuming motion allows content to appear.

**Cause:** `styles.css:555` pauses every animation globally. `.mission-panel` uses the `readout-enter` animation, whose initial frame has opacity zero (`styles.css:438`, `styles.css:561`).

**Recommendation:** Pause only decorative/orbital motion. For content transitions, immediately show the final state when motion is paused. Add a browser regression test that pauses, switches every tab, and checks both visibility and keyboard activation.

### 2. Atlas currently leads to a server error

`https://atlas.santhoshbalaji.cloud/` returned HTTP 502, and a rendered visit displayed Cloudflare “Bad gateway” with “Host Error.” JurisField returned 200; NammaTN redirected to `/welcome/` and returned 200.

**Recommendation:** Repair Atlas availability independently of the portfolio. Add read-only link-health monitoring. If an outage cannot immediately be resolved, provide an honest availability state and a case-study/demo fallback; do not present an unavailable destination as the only evidence of the product.

### 3. Mobile visitors cannot pause the automatic motion

At 390 px the header and mobile menu expose no pause control; `.motion-control` is `display: none` below 820 px (`styles.css:593`). Product cycling and the 3D animation continue for visitors without an OS reduced-motion preference.

**Recommendation:** Provide a visible, comfortably sized pause/resume control within the scene or mobile menu. Keep that control separate from reset. OS reduced-motion support is valuable but does not replace a user-facing control.

### 4. Initial loading still visibly changes the scene

Clean reload screenshots exposed the flat orbit preview and “Establishing product orbit” before the final 3D Earth. The Earth scale, framing, and treatment differ substantially. A “Signal copied” toast was also briefly visible during initial loading, before the copy-email button had been used in that page session.

**Recommendation:** Match the initial presentation to the final 3D composition and keep the transition visually stable. Put essential hidden-state CSS in the critical path. Initialize the copy status empty/hidden and populate it only after a real copy result. The asynchronous stylesheets and missing critical toast styling are a likely contributor to the transient notification; confirm this with a cold-load filmstrip.

## Priority 2 — usability, credibility, and presentation

### 5. Improve typography and contrast

Measured mobile sizes include 6.4 px for the wordmark role, 6.24 px for “Full-stack developer,” 6.72 px for the identity description, and 8.96 px for Menu. The career strip and technical metadata are also visually small compared with the oversized headlines.

PageSpeed specifically flags the wordmark-role text and trademark note for insufficient contrast. This is not just a subjective preference.

**Recommendation:** Aim for approximately 12–14 px for meaningful labels, 15–16 px for reading text, and fewer tiny uppercase metadata lines. Increase contrast without abandoning the black theme. Use comfortably sized menu and scene controls—approximately 44 px is a useful usability target. WCAG 2.2's AA minimum target-size criterion is 24 × 24 CSS px with exceptions, including spacing; do not equate every small label with an automatic conformance failure. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### 6. Show the applications, not just their identities

All four panels provide a headline, brief description, role, and stack. None shows an actual application screenshot, a concrete workflow, an architecture decision, or a verified outcome. MapSmith has an outward arrow in its tab but no destination CTA in its panel.

**Recommendation:** Add a concise case study for each product: problem, intended users, a real interface/workflow, personal ownership, one important engineering tradeoff, and an evidenced outcome. Use factual qualitative outcomes when metrics are unavailable. Do not invent adoption numbers. Clearly distinguish live products, private work, and work in progress. Give MapSmith an intentional next action or an honest status.

### 7. Make the next sections easier to scan

The selected-work layout has a narrow, heavily wrapped headline and a large area of unused space around a short description. The career experience is compressed into a small strip despite its relevance to professional credibility. Contact is visually coherent but uses a very large generic headline and extremely small supporting labels.

**Recommendation:** Give work screenshots and evidence the dominant area. Use a shorter product proposition above them, then a small technical summary. Expand the career area into readable entries with role, dates, scope, and one or two factual contributions. Keep contact concise and clarify the kinds of collaboration available. Preserve the established portrait, typography-led wordmark, and space theme.

### 8. Clarify navigation and interaction

“Missions,” “Trajectory,” “Transmit,” and “Enter the system” require interpretation. Desktop scene controls are tiny, and a wheel scroll over the 3D area zoomed the scene without advancing the page. The mobile menu closes when selecting a section, but pressing Escape on its open toggle did not close it.

**Recommendation:** Use plain primary labels such as Work, Experience, and Contact; retain orbital language as secondary styling. Make “View projects” the obvious content CTA. Keep drag-to-rotate, but let normal scrolling move the page and offer explicit zoom controls or modifier-key zoom. Add Escape dismissal and clear focus return for the menu.

### 9. Refine the 3D art direction without rebuilding it

The scene is recognizable and interactive. In the reviewed views, the Earth has a conspicuous bright specular spot and thick blue rim; distant/dim product planets can be hard to identify. These are visual judgments, not claims that the model fails to render.

**Recommendation:** Soften the ocean highlight and atmospheric rim, preserve accurate product colors, and emphasize focused products with readable labels and modest lighting. Keep the four products and Earth. Continue regression testing the near-side, far-side, and limb crossings; a brief audit cannot establish correctness through every possible camera/orbit combination.

## Priority 3 — accessibility, discovery, and maintenance

### 10. Address accessibility beyond the numerical score

- The rotating readout is `aria-live="polite"` and changes every 3.2 seconds. That creates a risk of repeated announcements; confirm with VoiceOver/NVDA and announce user-initiated selections instead of every automatic cycle.
- The stage accessible label continues to say “loading” after the scene is ready.
- The toast status contains “Signal copied” even before copying; keep inactive status text empty.
- PageSpeed's experimental Agentic Browsing audit flags `<article role="tabpanel">` as an inappropriate role/element pairing. Validate the tab markup with an accessibility checker and use a neutral panel element with correct relationships.
- The tested OS reduced-motion path successfully retained the lightweight scene and displayed product panels correctly. Preserve that behavior.

### 11. Strengthen search and sharing

Title, description, canonical URL, basic Open Graph text, and a favicon are present. `og:image` and structured JSON-LD are absent. `/robots.txt` and `/sitemap.xml` returned 404. Their absence is not automatically an indexing failure, and the basic Lighthouse SEO audit still scores 100.

**Recommendation:** Add a professional social preview image, accurate Person/ProfilePage structured data, and sitemap/robots files. Give substantive case studies their own shareable URLs and descriptive titles. Avoid expanding metadata with unsupported claims.

### 12. Preserve privacy; improve delivery and testing controls

The analytics code is restricted to the production hostname and checks Global Privacy Control/Do Not Track before loading Cloudflare's beacon. The inspected first-party code avoids analytics cookies and persistent browser identifiers. The privacy page is linked and readable. This is a useful foundation—not a certification of legal compliance or of all vendor-side behavior.

The sampled HTTPS response has a 10-minute cache policy and does not include CSP, HSTS, or clickjacking-protection headers. Evaluate security headers at the hosting/edge layer; test a CSP in report-only mode first because inline styles and stylesheet onload handlers currently need compatibility work. Treat this as hardening, not evidence of an exploitable vulnerability.

`npm test` passed, but `scripts/verify.mjs` primarily checks source strings and asset existence. It did not catch the visibly blank paused panels or the external Atlas outage. Add browser tests for desktop/mobile navigation, all tab states, paused/reduced motion, startup/failure recovery, 3D selection/reset, and screenshots around Earth crossings. Add accessibility, link-health, and performance checks to the release process.

## What passed

- Automatic WebGL startup reached ready on the tested desktop browser.
- Drag and keyboard rotation visibly changed the scene; reset and zoom controls were exercised without logged errors.
- All four planet links activated the corresponding product panel.
- Product tabs and arrow-key selection worked with normal motion enabled.
- Zoho, Forest Department, and Founder career content was available through the tabs.
- Main section navigation, mobile section selection, privacy navigation, and copy-email UI feedback worked. Clipboard contents were not inspected; no email or external message was sent.
- The 390 px and 320 px tested layouts had no document-level horizontal overflow. At 320 px the email wraps awkwardly mid-domain; improve its presentation.
- Reduced-motion fallback and tab content visibility passed.
- No warning/error entries were returned by the browser log checks during the tested live flows.
- The local source/asset verification suite passed.

## Recommended implementation sequence

1. **Reliability:** fix paused panels, restore Atlas availability, add mobile pause, eliminate the initial preview/toast flash, and add regressions for those exact failures.
2. **Performance and accessibility:** profile and tune automatic 3D, repair contrast and tiny controls, refine scroll behavior and announcements, and remeasure on physical devices plus PageSpeed.
3. **Content and presentation:** add real product evidence, strengthen career entries, simplify navigation and CTAs, then refine Earth lighting and scene labels.
4. **Discovery and operations:** add share metadata/case-study URLs, verify privacy behavior, introduce header/cache hardening and automated release checks.

Success should mean visitors can quickly understand your work, evaluate real evidence, contact you, and enjoy the 3D scene without losing responsiveness or accessibility.
