import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { projects } from "../projects.mjs";
import { pages } from "../pages.mjs";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
process.chdir(root.pathname);
await mkdir("assets/build", { recursive: true });
await mkdir("work", { recursive: true });
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#000"/><ellipse cx="1030" cy="340" rx="300" ry="190" fill="none" stroke="#242c42"/><ellipse cx="1030" cy="340" rx="390" ry="250" fill="none" stroke="#151c2b"/><circle cx="940" cy="175" r="8" fill="#b8d94b"/><circle cx="1090" cy="511" r="7" fill="#8f78ff"/><text x="80" y="110" fill="#aab7cb" font-family="Helvetica,Arial,sans-serif" font-size="24">SANTHOSH BALAJI S</text><text x="76" y="275" fill="#f2f6ff" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="600">I design and build</text><text x="76" y="360" fill="#b8c6ff" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="600">software, end to end.</text><path d="M80 440H140" stroke="#b8c6ff" stroke-width="2"/><text x="80" y="492" fill="#aab7cb" font-family="Helvetica,Arial,sans-serif" font-size="24">Software Developer and Product Builder · Chennai</text><text x="80" y="554" fill="#8c9ab0" font-family="Helvetica,Arial,sans-serif" font-size="22">santhoshbalaji.cloud</text></svg>`)).png().toFile("assets/social-card.png");
const result = await build({
  entryPoints: { site: "script.js" }, outdir: "assets/build", bundle: true,
  splitting: true, format: "esm", minify: true, target: "es2022",
  entryNames: "[name]-[hash]", chunkNames: "chunk-[hash]", metafile: true,
  sourcemap: true, sourcesContent: false,
});
const entry = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint === "script.js")[0];
const cssResult = await build({
  stdin: { contents: `${await readFile("theme.css", "utf8")}\n${await readFile("styles.css", "utf8")}`, loader: "css" },
  minify: true, write: false,
});
const css = cssResult.outputFiles[0].text;
const cssPath = `assets/build/site-${createHash("sha256").update(css).digest("hex").slice(0,12)}.css`;
// CSS URLs are relative to the generated stylesheet, not the document.
await writeFile(cssPath, css.replaceAll('url(assets/', 'url(../../assets/').replaceAll('url("assets/', 'url("../../assets/'));

const person = { "@context": "https://schema.org", "@type": "ProfilePage", url: "https://santhoshbalaji.cloud/", mainEntity: {
  "@type": "Person", name: "Santhosh Balaji S", jobTitle: "Software Developer and Product Builder",
  url: "https://santhoshbalaji.cloud/", image: "https://santhoshbalaji.cloud/assets/profile/santhosh-balaji-288.webp",
  sameAs: ["https://x.com/SanthoshBala_S", "https://linkedin.com/in/santhoshbalajis", "https://github.com/santhoshbalaji", "https://www.youtube.com/@santhoshbala_s"],
} };
let html = await readFile("index.html", "utf8");
const desktopPoster = await sharp("assets/universe-preview.webp").metadata();
const mobilePoster = await sharp("assets/universe-preview-mobile.webp").metadata();
html = html.replace(/(<source media="\(max-width: 820px\)" srcset="assets\/universe-preview-mobile.webp")[^>]*>/, `$1 width="${mobilePoster.width}" height="${mobilePoster.height}" />`);
html = html.replace(/(<img src="assets\/universe-preview.webp") width="\d+" height="\d+"/, `$1 width="${desktopPoster.width}" height="${desktopPoster.height}"`);
// Replace the previous duplicated critical CSS/async stylesheet sequence in one build migration.
html = html.replace(/    <link rel="stylesheet" href="theme\.min\.css[^\n]+\n[\s\S]*?<script src="script\.min\.js[^\n]+\n/, `    <link data-site-css rel="stylesheet" href="${cssPath}" />\n    <script data-site-js type="module" src="${entry}"></script>\n`);
html = html.replace(/<style data-site-css[^>]*>[\s\S]*?<\/style>/, `<link data-site-css rel="stylesheet" href="${cssPath}" />`);
html = html.replace(/<link data-site-css[^>]+>/, `<style data-site-css data-source="${cssPath}">${css}</style>`)
  .replace(/<script data-site-js[^>]+><\/script>/, `<script data-site-js type="module" src="${entry}"></script>`);
const metadata = `<meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png" />
    <meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Santhosh Balaji S — software developer and product builder" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(person)}</script>`;
html = html.replace(/\s*<!-- generated metadata -->[\s\S]*?<!-- end generated metadata -->/, "");
html = html.replace("</head>", `    <!-- generated metadata -->\n    ${metadata}\n    <!-- end generated metadata -->\n    <noscript><style>.gravity-stage[data-three-state=booting] :is(.solar-orbits,.gravity-core,.system-object){visibility:visible}.universe-boot,.universe-poster,.universe-activate,.stage-controls{display:none!important}.mission-panel[hidden],.career-note[hidden]{display:grid!important}.mission-selector,.career-path,.menu-button,.motion-control,.copy-email{display:none!important}</style></noscript>\n  </head>`);
// Keep repeated builds deterministic.
html = html.replace(/(<noscript><style>\.gravity-stage[\s\S]*?<\/noscript>)([\s\S]*?)\1/g, "$2$1");
await writeFile("index.html", html.replace(/[ \t]+$/gm, ""));
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

// One header and one footer for every generated page. r is the path back to the site root.
const WORDMARK = (r) => `<a class="wordmark" href="${r}index.html" aria-label="Santhosh Balaji S, home"><span class="wordmark-name"><b>Santhosh</b><span>Balaji</span><em>S</em></span><span class="wordmark-role"><i aria-hidden="true"></i>Software Developer and Product Builder</span></a>`;
const HEADER = (r) => `<header class="project-header">${WORDMARK(r)}<nav aria-label="Primary navigation"><a href="${r}index.html#work">Work</a><a href="${r}work-with-me.html">Services</a><a href="${r}about.html">About</a><a href="${r}index.html#contact">Contact</a></nav></header>`;
const FOOTER = (r, note = "") => `<footer class="site-footer"><p>© 2026 Santhosh Balaji S</p><p>Chennai, India</p><div class="footer-links"><a href="${r}index.html#work">Work</a><a href="${r}work-with-me.html">Services</a><a href="${r}about.html">About</a><a href="${r}privacy.html">Privacy</a></div>${note ? `<p class="trademark-note">${note}</p>` : ""}</footer>`;

// Reading pages: About, Work with me and Privacy. Same day theme and stylesheet as the project notes.
for (const pg of pages) {
  const page = `<!doctype html>
<html lang="en" data-theme="day"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pg.label} — Santhosh Balaji S</title><meta name="description" content="${escape(pg.description)}">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#f4f6f8">
<link rel="canonical" href="https://santhoshbalaji.cloud/${pg.id}.html"><link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:url" content="https://santhoshbalaji.cloud/${pg.id}.html"><meta property="og:title" content="${pg.label} — Santhosh Balaji S"><meta property="og:description" content="${escape(pg.description)}"><meta property="og:type" content="website"><meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${cssPath}"><script src="analytics.js?v=1" defer></script>${pg.script ? `<script src="${pg.script}?v=1" defer></script>` : ""}</head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
${HEADER("")}
<main id="main" class="project-story" style="--active-accent:var(--signal-blue)">
<div class="project-intro"><p class="section-label">${pg.label}</p><h1>${pg.title}</h1><p class="project-lead">${pg.lead}</p></div>
${pg.sections.map((sec, i) => sec.wide ? `<section class="page-wide" aria-labelledby="s${i}"><p class="section-label">${sec.label}</p><h2 id="s${i}">${sec.title}</h2>${sec.body}</section>` : `<section class="project-context" aria-labelledby="s${i}"><div><p class="section-label">${sec.label}</p><h2 id="s${i}">${sec.title}</h2></div><div>${sec.body}</div></section>`).join("\n")}
<footer class="project-next"><p>${pg.next[0]}</p><a class="mission-link" href="${pg.next[2]}">${pg.next[1]} →</a><a href="index.html">Back to the home page</a></footer></main>
${FOOTER("")}</body></html>`;
  await writeFile(`${pg.id}.html`, page);
}
// 404 page. GitHub Pages serves it at any depth, so every path is root-relative.
await writeFile("404.html", `<!doctype html>
<html lang="en" data-theme="day"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — Santhosh Balaji S</title><meta name="robots" content="noindex"><meta name="theme-color" content="#f4f6f8">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/${cssPath}"></head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
${HEADER("/")}
<main id="main" class="project-story" style="--active-accent:var(--signal-blue)">
<div class="project-intro"><p class="section-label">Error 404</p><h1>This page doesn’t exist.</h1><p class="project-lead">The link may be old or mistyped. These will get you back on track.</p></div>
<footer class="project-next"><p>Where to next?</p><a class="mission-link" href="/index.html#work">View my work →</a><a href="/work-with-me.html">Services</a><a href="/about.html">About</a><a href="/index.html">Home page</a></footer></main>
${FOOTER("/")}</body></html>`);
for (const p of projects) {
  const page = `<!doctype html>
<html lang="en" data-theme="day"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.name} — Product notes by Santhosh Balaji S</title><meta name="description" content="${escape(p.lead)}">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#f4f6f8">
<link rel="canonical" href="https://santhoshbalaji.cloud/work/${p.id}.html"><link rel="icon" href="../favicon.svg" type="image/svg+xml">
<meta property="og:url" content="https://santhoshbalaji.cloud/work/${p.id}.html"><meta property="og:title" content="${p.name} — Product notes"><meta property="og:description" content="${escape(p.lead)}"><meta property="og:type" content="article"><meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../${cssPath}"><script src="../analytics.js?v=1" defer></script></head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
${HEADER("../")}
<main id="main" class="project-story" style="--active-accent:var(--${p.id})">
<div class="project-intro"><img src="../assets/logos/${p.id}.svg" width="64" height="64" alt=""><p class="section-label">${p.name} / ${p.category}</p><h1>${p.title}</h1><p class="project-lead">${p.lead}</p><p class="project-availability">${p.status}</p>${p.url && !p.unavailable ? `<a class="primary-action" href="${p.url}" target="_blank" rel="noreferrer">${p.next} ↗</a>` : p.demo ? `<a class="primary-action" href="mailto:contact@santhoshbalaji.cloud?subject=${encodeURIComponent(p.name + " demo")}">Ask for a demo →</a>` : ""}</div>
${p.image ? `<figure class="project-preview"><a href="../${p.image}" aria-label="Open the ${p.name} image at full size"><img src="../${p.image}" alt="${escape(p.imageAlt)}" width="1600" height="${p.imageH ?? 640}" loading="lazy" decoding="async"></a><figcaption>${p.imageCaption}</figcaption></figure>` : ""}
${p.story ? `<section class="project-context" aria-labelledby="story"><div><p class="section-label">The story</p><h2 id="story">Why I built it.</h2></div><p>${p.story}</p></section>\n` : ""}<section class="project-context" aria-labelledby="problem"><div><p class="section-label">The problem</p><h2 id="problem">What it solves.</h2></div><div><p>${p.problem}</p><p><strong>Who it’s for:</strong> ${p.audience}</p></div></section>
<section aria-labelledby="workflow"><p class="section-label">Workflow</p><h2 id="workflow">How ${p.name} works.</h2><ol class="project-flow">${p.steps.map(([title, text], i) => `<li><b>0${i+1}</b><strong>${title}</strong><span>${text}</span></li>`).join("")}</ol></section>
<section class="project-context" aria-labelledby="engineering"><div><p class="section-label">Engineering</p><h2 id="engineering">Decisions and limits.</h2></div><div><p>${p.decision}</p><p>${p.boundary}</p></div></section>
<section class="project-context" aria-labelledby="ownership"><div><p class="section-label">My role</p><h2 id="ownership">What I built.</h2></div><div><p>${p.ownership}</p><ul class="project-facts">${p.facts.map(f=>`<li>${f}</li>`).join("")}</ul><p class="stack-list">${p.stack.join(" · ")}</p></div></section>
<footer class="project-next"><p>Want to discuss a similar challenge?</p><a class="mission-link" href="mailto:contact@santhoshbalaji.cloud">Let’s talk →</a><a href="../index.html#work">Back to all work</a></footer></main>
${FOOTER("../", "Independent product work. No organisational endorsement implied.")}</body></html>`;
  await writeFile(`work/${p.id}.html`, page);
}
await writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["", "about.html", "work-with-me.html", "usage.html", "privacy.html", ...projects.map(p=>`work/${p.id}.html`)].map(path=>`  <url><loc>https://santhoshbalaji.cloud/${path}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile("robots.txt", "User-agent: *\nAllow: /\nSitemap: https://santhoshbalaji.cloud/sitemap.xml\n");
await writeFile("build-manifest.json", JSON.stringify({ entry, css: cssPath, outputs: Object.keys(result.metafile.outputs) }, null, 2) + "\n");
console.log(`Built ${entry}, ${cssPath} and ${projects.length} project pages.`);

// AI usage page, from usage.json (written by `npm run usage` from T3 Code's usage cache and thread records).
import { existsSync } from "node:fs";
if (existsSync("usage.json")) {
  const u = JSON.parse(await readFile("usage.json", "utf8"));
  const n = (v) => v >= 1e9 ? (v / 1e9).toFixed(2) + " billion" : v >= 1e6 ? (v / 1e6).toFixed(1) + " million" : Math.round(v).toLocaleString("en-GB");
  const short = (v) => v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.round(v).toLocaleString("en-GB");
  const date = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const fresh = (x) => x.uncached + x.cacheWrites;
  const share = (x) => ((x.processed / u.total.processed) * 100).toFixed(1) + "%";
  const max = Math.max(...u.days.map((d) => d.output));
  const shown = (o) => Object.entries(o).filter(([, x]) => x.processed >= 1e7).sort((a, b) => b[1].processed - a[1].processed);
  const row = (name, x) => `<tr><th scope="row">${name}</th><td>${short(x.processed)}</td><td>${share(x)}</td><td>${short(fresh(x))}</td><td>${short(x.output)}</td></tr>`;
  const head = (first) => `<thead><tr><th scope="col">${first}</th><th scope="col">Tokens processed</th><th scope="col">Share</th><th scope="col">New input</th><th scope="col">Output</th></tr></thead>`;
  const provRows = shown(u.providers).map(([k, x]) => row(k, x)).join("");
  const modelRows = shown(u.models).map(([k, x]) => row(k, x)).join("");
  const bars = u.days.map((d) => `<li><span>${date(d.day).replace(/ \d{4}$/, "")}</span><i style="width:${Math.max(1, (d.output / max) * 100).toFixed(1)}%"></i><b>${short(d.output)}</b></li>`).join("");
  const page = `<!doctype html>
<html lang="en" data-theme="day"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI usage — Santhosh Balaji S</title><meta name="description" content="How many tokens my AI coding agents used, by provider, model and day, from my own records.">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#f4f6f8">
<link rel="canonical" href="https://santhoshbalaji.cloud/usage.html"><link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:url" content="https://santhoshbalaji.cloud/usage.html"><meta property="og:title" content="AI usage — Santhosh Balaji S"><meta property="og:description" content="How I use AI coding agents, with token counts by provider, model and day from my own records."><meta property="og:type" content="website"><meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${cssPath}"><script src="analytics.js?v=1" defer></script></head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
${HEADER("")}
<main id="main" class="project-story" style="--active-accent:var(--signal-blue)">
<div class="project-intro"><p class="section-label">AI usage</p><h1>How I use coding agents, in numbers.</h1><p class="project-lead">From ${date(u.from)} to ${date(u.to)} I ran ${u.threads.toLocaleString("en-GB")} agent threads. They processed ${n(u.total.processed)} tokens and wrote ${n(u.total.output)}. I made the architecture decisions, reviewed the code and decided what shipped. The figures come from T3 Code, the tool I run the agents in.</p></div>
<section class="project-context" aria-labelledby="u1"><div><p class="section-label">Totals</p><h2 id="u1">What the numbers mean.</h2></div><div><ul class="usage-stats"><li><b>${short(u.total.output)}</b><span>Output: what the agents wrote</span></li><li><b>${short(fresh(u.total))}</b><span>New input: what they read for the first time</span></li><li><b>${short(u.total.processed)}</b><span>Processed in total, mostly cached re-reads</span></li></ul><p>New input is input that was not already cached. Most of the processed total is cached: earlier parts of a conversation that an agent reads again on later turns.</p></div></section>
<section aria-labelledby="u2"><p class="section-label">By day</p><h2 id="u2">Output tokens per day.</h2><ol class="usage-days">${bars}</ol></section>
<section aria-labelledby="u3"><p class="section-label">By provider</p><h2 id="u3">Usage by provider.</h2><div class="usage-table" role="region" aria-labelledby="u3" tabindex="0"><table>${head("Provider")}<tbody>${provRows}</tbody></table></div></section>
<section aria-labelledby="u4"><p class="section-label">By model</p><h2 id="u4">Usage by model.</h2><div class="usage-table" role="region" aria-labelledby="u4" tabindex="0"><table>${head("Model")}<tbody>${modelRows}</tbody></table></div><p class="diagram-note">Rows under 10 million tokens are left out. Days are in India time. Updated ${date(u.generatedAt)}.</p></section>
<footer class="project-next"><p>Want this way of working on your project?</p><a class="mission-link" href="work-with-me.html">Work with me →</a><a href="about.html">Back to About</a></footer></main>
${FOOTER("")}</body></html>`;
  await writeFile("usage.html", page);
}
