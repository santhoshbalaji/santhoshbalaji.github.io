import assert from "node:assert/strict";
import { readFile, access, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { projects } from "../projects.mjs";
const read = name => readFile(new URL(`../${name}`, import.meta.url), "utf8");
const html = await read("index.html"), css = await read("styles.css"), js = await read("script.js");
const analytics = await read("analytics.js"), privacy = await read("privacy.html");
const manifest = JSON.parse(await read("build-manifest.json"));
const check = (condition, name) => { assert.ok(condition, name); console.log(`✓ ${name}`); };
check(html.includes("<title>Santhosh Balaji S — Software Developer</title>"), "Developer identity retained");
check(html.includes('data-theme="orbital"') && html.includes(manifest.css) && html.includes(manifest.entry), "Fingerprint build is used by the page");
check(!html.includes('media="print"') && !html.includes('this.media='), "No async stylesheet/critical-style mismatch");
check((html.match(/<!-- generated metadata -->/g)||[]).length === 1, "One generated metadata block");
check(html.includes("application/ld+json") && html.includes("og:image"), "Profile structured data and social preview are present");
check(html.includes('id="toast"') && html.includes('aria-live="polite" hidden></div>'), "Toast starts empty and hidden");
check(!html.includes('class="orbit-readout" aria-live') && !html.includes('class="mission-readout" aria-live'), "Automatic product cycling does not announce repeatedly");
check(!/<article[^>]+role="tabpanel"/.test(html), "Tab panels use appropriate elements");
check(html.includes('data-motion-toggle') && html.includes('class="stage-motion"'), "Desktop and mobile motion controls exist");
check(html.includes("contact@santhoshbalaji.cloud") && html.includes("mailto:contact@santhoshbalaji.cloud"), "Contact address retained");
for (const url of ["https://x.com/SanthoshBala_S", "https://linkedin.com/in/santhoshbalajis", "https://github.com/santhoshbalaji"]) check(html.includes(url), `Social destination ${url}`);
check(html.includes("Zoho Corporation") && html.includes("Tamil Nadu Forest Department") && html.includes("no endorsement is implied"), "Factual career identity and trademark attribution retained");
check(!html.includes("Résumé") && !html.includes(".pdf") && !html.includes("Political Science"), "Previously removed profile content stays removed");
for (const p of projects) {
  check(html.includes(`work/${p.id}.html`), `${p.name} has a useful destination`);
  await access(new URL(`../assets/logos/${p.id}.svg`, import.meta.url));
  const page = await read(`work/${p.id}.html`);
  check(page.includes(p.title) && page.includes(p.ownership), `${p.name} has workflow and ownership context`);
}
check(analytics.includes('window.location.hostname === "santhoshbalaji.cloud"') && analytics.includes("navigator.globalPrivacyControl === true") && analytics.includes('navigator.doNotTrack === "1"'), "Analytics stays production-only and respects GPC/DNT");
check(![html,js,analytics,privacy].some(source=>/document\.cookie|localStorage|sessionStorage|google-analytics\.com|hotjar|clarity\.ms/i.test(source)), "No cookies, persistent visitor IDs or invasive trackers added");
check(privacy.includes("Analytics cookies</dt><dd>None") && privacy.includes("Visitor profiles</dt><dd>None"), "Privacy notice retained");
check(css.includes("prefers-reduced-motion") && css.includes(":focus-visible"), "Motion preference and keyboard focus styles retained");
let totalJs = 0;
for (const file of manifest.outputs.filter(f=>f.endsWith(".js"))) totalJs += gzipSync(await read(file)).length;
check(gzipSync(await read(manifest.entry)).length < 16000, "Initial JS gzip under 16 KB");
check(totalJs < 220000, "All JS including lazy 3D gzip under 220 KB");
check(gzipSync(await read(manifest.css)).length < 20000, "CSS gzip under 20 KB");
for (const asset of ["assets/universe-preview.webp","assets/universe-preview-mobile.webp","assets/social-card.png","assets/projects/nammatn-interface.webp","robots.txt","sitemap.xml"]) {
  const size = (await stat(new URL(`../${asset}`, import.meta.url))).size;
  check(size > 0, `${asset} exists`);
}
check((await read("CNAME")).trim() === "santhoshbalaji.cloud", "Production domain configuration retained");
console.log("Static checks complete. Run npm run test:browser for rendered behavior.");
