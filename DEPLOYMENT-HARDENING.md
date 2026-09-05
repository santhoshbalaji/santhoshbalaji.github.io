# Portfolio hosting follow-up

This project is currently published from GitHub Pages. These are deployment tasks,
not headers that the local application can enforce. No CDN, DNS or server settings
were changed by the September 2026 portfolio update.

## Edge headers

At an HTTPS reverse proxy/CDN, test and apply:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (the portfolio itself uses none)
- `Content-Security-Policy-Report-Only` first, before enforcing CSP. The application
  needs same-origin scripts/modules, images including data URLs used by the 3D
  scene, and the existing Cloudflare Web Analytics script/connect origins. Inline
  generated CSS and JSON-LD need release-specific hashes or a tested policy. Use
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, and
  `form-action 'self'` once the policy has been validated in production.
- Consider `X-Frame-Options: DENY` as a legacy framing fallback.
- HSTS only after verifying HTTPS for the intended hostname. Do **not** blindly
  set `includeSubDomains` or preload: product subdomains are separate services.

`frame-ancestors` is not effective in a meta CSP. A `_headers` file has no effect
on GitHub Pages; adding one would not make these protections live.

## Caching

- HTML, `robots.txt` and `sitemap.xml`: short cache/revalidation.
- Content-hashed `/assets/build/` files: `public, max-age=31536000, immutable` where
  supported by the edge. Serve gzip/Brotli. Keep previous release hashes during a
  rollout so visitors with cached HTML can finish loading.
- Unfingerprinted photos, textures and posters: keep a shorter policy until they
  are versioned too; do not apply an immutable rule to all `/assets/` indiscriminately.

## Release gates

1. `npm ci && npm run build && npm test && npm run test:browser`.
2. Review desktop/mobile screenshots in `test-results/`, including the orbital cycle.
3. Run `npm run test:links` and check the public landing pages. Atlas was reverified
   with HTTP 200 and a rendered landing page on 5 September 2026; its visit links
   are restored. Recheck availability at release time.
4. Commit the fingerprinted build and generated project pages with the source.
5. After explicit release approval, push/deploy; confirm the production HTML uses
   the same entry/CSS fingerprint as `build-manifest.json`.
6. Repeat production PageSpeed and real-device tests. Local Lighthouse is not a
   production score or proof of real-user INP. Keep automatic 3D; do not special-case
   test agents or revert to a click-only experience to inflate the score.

Link checks are manual/CI-invokable. No recurring monitoring, tracking identifiers,
session recording or new cookies were introduced.
