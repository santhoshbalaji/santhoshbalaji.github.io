# Santhosh Balaji S — Portfolio

A responsive, accessible personal portfolio built as a lightweight static site.

Live site: [https://santhoshbalaji.cloud](https://santhoshbalaji.cloud)

## Run locally

```bash
npm ci
npm run build
npm run dev
```

Then open [http://localhost:4173](http://localhost:4173).

## Verify

```bash
npm test
npm run test:browser
npm run test:links
```

The homepage content lives in `index.html`; product notes are generated from
`projects.mjs`. The centralized orbital design tokens live in `theme.css`, component
styling in `styles.css`, and interaction state in `script.js`. Run `npm run build`
after changes. Do not hand-edit generated `assets/build/`, `work/`, or inline CSS.

The build fingerprints the JS/CSS, keeps Three.js in an automatically loaded lazy
chunk, and inlines the exact generated homepage stylesheet to avoid a flash of
inconsistent styles. Privacy/project pages reuse the fingerprinted CSS. All content
remains static; no framework, cookies or new analytics are required.

Browser tests use installed Google Chrome locally and Playwright Chromium on CI.
They include mobile layouts, motion/keyboard controls, failure recovery, a 72-second
orbital cycle, and screenshots in `test-results/`. Unit tests compare sphere
occlusion with Three.js over 103,680 camera/orbit configurations. The asset checks
enforce gzip budgets of 16 KB initial JS, 220 KB total JS and 20 KB CSS.

`npm run preview:assets` captures loading previews directly from the live 3D canvas
(run the local server first). Capture again after changing the camera/composition.
The NammaTN screenshot is a labelled interface preview with demonstration content;
the other project pages show implementation workflows, not fabricated UI screenshots.

`node scripts/serve.mjs --port 4174` provides a localhost-only gzip server for a
closer-to-production Lighthouse comparison. Never equate local scores with live
PageSpeed or physical-device measurements.

## Deployment

The site is published from the `main` branch of `santhoshbalaji/santhoshbalaji.github.io` using GitHub Pages. The root `CNAME` file connects the deployment to `santhoshbalaji.cloud`, and `.nojekyll` keeps the static assets unmodified.

Commit generated files with their sources. See [deployment hardening](DEPLOYMENT-HARDENING.md)
for edge-header/cache configuration and release verification. Those settings require
separate hosting access; a `_headers` file would not configure GitHub Pages.
