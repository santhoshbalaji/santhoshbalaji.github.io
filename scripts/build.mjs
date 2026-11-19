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
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#000"/><ellipse cx="1030" cy="340" rx="300" ry="190" fill="none" stroke="#242c42"/><ellipse cx="1030" cy="340" rx="390" ry="250" fill="none" stroke="#151c2b"/><circle cx="940" cy="175" r="8" fill="#b8d94b"/><circle cx="1090" cy="511" r="7" fill="#8f78ff"/><text x="80" y="110" fill="#aab7cb" font-family="Helvetica,Arial,sans-serif" font-size="24">SANTHOSH BALAJI S</text><text x="76" y="275" fill="#f2f6ff" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="600">I build GIS platforms</text><text x="76" y="360" fill="#b8c6ff" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="600">and AI agent systems.</text><path d="M80 440H140" stroke="#b8c6ff" stroke-width="2"/><text x="80" y="492" fill="#aab7cb" font-family="Helvetica,Arial,sans-serif" font-size="24">Software developer · Product engineering · Chennai</text><text x="80" y="554" fill="#8c9ab0" font-family="Helvetica,Arial,sans-serif" font-size="22">santhoshbalaji.cloud</text></svg>`)).png().toFile("assets/social-card.png");
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
  "@type": "Person", name: "Santhosh Balaji S", jobTitle: "Software Developer",
  url: "https://santhoshbalaji.cloud/", image: "https://santhoshbalaji.cloud/assets/profile/santhosh-balaji-288.webp",
  sameAs: ["https://x.com/SanthoshBala_S", "https://linkedin.com/in/santhoshbalajis", "https://github.com/santhoshbalaji"],
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
    <meta property="og:image:alt" content="Santhosh Balaji S — software developer building dependable products" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(person)}</script>`;
html = html.replace(/\s*<!-- generated metadata -->[\s\S]*?<!-- end generated metadata -->/, "");
html = html.replace("</head>", `    <!-- generated metadata -->\n    ${metadata}\n    <!-- end generated metadata -->\n    <noscript><style>.gravity-stage[data-three-state=booting] :is(.solar-orbits,.gravity-core,.system-object){visibility:visible}.universe-boot,.universe-poster,.universe-activate,.stage-controls{display:none!important}.mission-panel[hidden],.career-note[hidden]{display:grid!important}.mission-selector,.career-path,.menu-button,.motion-control,.copy-email{display:none!important}</style></noscript>\n  </head>`);
// Keep repeated builds deterministic.
html = html.replace(/(<noscript><style>\.gravity-stage[\s\S]*?<\/noscript>)([\s\S]*?)\1/g, "$2$1");
await writeFile("index.html", html.replace(/[ \t]+$/gm, ""));
let privacy = await readFile("privacy.html", "utf8");
privacy = privacy.replace(/<link rel="stylesheet" href="(?:theme|styles)\.min\.css[^>]+>\s*/g, "");
privacy = privacy.replace(/<link data-site-css[^>]+>\s*/g, "");
privacy = privacy.replace("</head>", `<link data-site-css rel="stylesheet" href="${cssPath}" />\n  </head>`);
await writeFile("privacy.html", privacy);

const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

// Reading pages: About and Work with me. Same day theme and stylesheet as the project notes.
for (const pg of pages) {
  const page = `<!doctype html>
<html lang="en" data-theme="day"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pg.label} — Santhosh Balaji S</title><meta name="description" content="${escape(pg.description)}">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#f4f6f8">
<link rel="canonical" href="https://santhoshbalaji.cloud/${pg.id}.html"><link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${pg.label} — Santhosh Balaji S"><meta property="og:description" content="${escape(pg.description)}"><meta property="og:type" content="website"><meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${cssPath}"><script src="analytics.js?v=1" defer></script></head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
<header class="project-header"><a class="wordmark" href="index.html" aria-label="Santhosh Balaji S, home"><span class="wordmark-name"><b>Santhosh</b><span>Balaji</span><em>S</em></span><span class="wordmark-role"><i aria-hidden="true"></i>Software Developer</span></a><nav aria-label="Page links"><a href="index.html">← Home</a><a href="index.html#contact">Contact ↗</a></nav></header>
<main id="main" class="project-story" style="--active-accent:var(--signal-blue)">
<div class="project-intro"><p class="section-label">${pg.label}</p><h1>${pg.title}</h1><p class="project-lead">${pg.lead}</p></div>
${pg.sections.map((sec, i) => sec.wide ? `<section class="page-wide" aria-labelledby="s${i}"><p class="section-label">${sec.label}</p><h2 id="s${i}">${sec.title}</h2>${sec.body}</section>` : `<section class="project-context" aria-labelledby="s${i}"><div><p class="section-label">${sec.label}</p><h2 id="s${i}">${sec.title}</h2></div><div>${sec.body}</div></section>`).join("\n")}
<footer class="project-next"><p>${pg.next[0]}</p><a class="mission-link" href="${pg.next[2]}">${pg.next[1]} →</a><a href="index.html">Back to the home page</a></footer></main>
<footer class="site-footer"><p>© 2026 Santhosh Balaji S</p><a href="privacy.html">Privacy</a></footer></body></html>`;
  await writeFile(`${pg.id}.html`, page);
}
for (const p of projects) {
  const page = `<!doctype html>
<html lang="en" data-theme="day"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.name} — Product notes by Santhosh Balaji S</title><meta name="description" content="${escape(p.lead)}">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#f4f6f8">
<link rel="canonical" href="https://santhoshbalaji.cloud/work/${p.id}.html"><link rel="icon" href="../favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${p.name} — Product notes"><meta property="og:description" content="${escape(p.lead)}"><meta property="og:type" content="article"><meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../${cssPath}"><script src="../analytics.js?v=1" defer></script></head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
<header class="project-header"><a class="wordmark" href="../index.html" aria-label="Santhosh Balaji S, home"><span class="wordmark-name"><b>Santhosh</b><span>Balaji</span><em>S</em></span><span class="wordmark-role"><i aria-hidden="true"></i>Software Developer</span></a><nav aria-label="Page links"><a href="../index.html#${p.id}">← All projects</a><a href="../index.html#contact">Contact ↗</a></nav></header>
<main id="main" class="project-story" style="--active-accent:var(--${p.id})">
<div class="project-intro"><img src="../assets/logos/${p.id}.svg" width="64" height="64" alt=""><p class="section-label">${p.name} / ${p.category}</p><h1>${p.title}</h1><p class="project-lead">${p.lead}</p><p class="project-availability">${p.status}</p>${p.url && !p.unavailable ? `<a class="primary-action" href="${p.url}" target="_blank" rel="noreferrer">${p.next} ↗</a>` : ""}</div>
${p.image ? `<figure class="project-preview"><img src="../${p.image}" alt="${escape(p.imageAlt)}" width="1600" height="640" loading="lazy" decoding="async"><figcaption>${p.imageCaption}</figcaption></figure>` : ""}
${p.story ? `<section class="project-context" aria-labelledby="story"><div><p class="section-label">The story</p><h2 id="story">Why I built it.</h2></div><p>${p.story}</p></section>\n` : ""}<section class="project-context" aria-labelledby="problem"><div><p class="section-label">The problem</p><h2 id="problem">${p.audience}</h2></div><p>${p.problem}</p></section>
<section aria-labelledby="workflow"><p class="section-label">How it works</p><h2 id="workflow">One connected workflow.</h2><ol class="project-flow">${p.steps.map(([title, text], i) => `<li><b>0${i+1}</b><strong>${title}</strong><span>${text}</span></li>`).join("")}</ol><p class="diagram-note">Engineering workflow · a simplified view of the product, not a screen mockup.</p></section>
<section class="project-context" aria-labelledby="engineering"><div><p class="section-label">Engineering decisions</p><h2 id="engineering">What matters beneath the interface.</h2></div><div><p>${p.decision}</p><p>${p.boundary}</p></div></section>
<section class="project-context" aria-labelledby="ownership"><div><p class="section-label">My contribution</p><h2 id="ownership">From product to implementation.</h2></div><div><p>${p.ownership}</p><ul class="project-facts">${p.facts.map(f=>`<li>${f}</li>`).join("")}</ul><p class="stack-list">${p.stack.join(" · ")}</p></div></section>
<footer class="project-next"><p>Want to discuss a similar challenge?</p><a class="mission-link" href="mailto:contact@santhoshbalaji.cloud">Let’s talk →</a><a href="../index.html#${p.id}">Back to the portfolio</a></footer></main>
<footer class="site-footer"><p>© 2026 Santhosh Balaji S</p><a href="../privacy.html">Privacy</a><p>Independent product work. No organizational endorsement implied.</p></footer></body></html>`;
  await writeFile(`work/${p.id}.html`, page);
}
await writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["", "privacy.html", ...projects.map(p=>`work/${p.id}.html`)].map(path=>`  <url><loc>https://santhoshbalaji.cloud/${path}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile("robots.txt", "User-agent: *\nAllow: /\nSitemap: https://santhoshbalaji.cloud/sitemap.xml\n");
await writeFile("build-manifest.json", JSON.stringify({ entry, css: cssPath, outputs: Object.keys(result.metafile.outputs) }, null, 2) + "\n");
console.log(`Built ${entry}, ${cssPath} and ${projects.length} project pages.`);

// AI usage page, from usage.json (written by `npm run usage` from local T3 Code records).
import { existsSync } from "node:fs";
if (existsSync("usage.json")) {
  const u = JSON.parse(await readFile("usage.json", "utf8"));
  const n = (v) => v >= 1e9 ? (v / 1e9).toFixed(2) + " billion" : v >= 1e6 ? (v / 1e6).toFixed(1) + " million" : Math.round(v).toLocaleString("en-GB");
  const short = (v) => v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.round(v).toLocaleString("en-GB");
  const date = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const fresh = (x) => Math.max(0, x.input - x.cached);
  const max = Math.max(...u.days.map((d) => d.output));
  const row = (name, x) => `<tr><th scope="row">${name}</th><td>${x.turns.toLocaleString("en-GB")}</td><td>${short(x.input)}</td><td>${short(fresh(x))}</td><td>${short(x.output)}</td></tr>`;
  const head = `<thead><tr><th scope="col"></th><th scope="col">Turns</th><th scope="col">Tokens processed</th><th scope="col">New input</th><th scope="col">Output</th></tr></thead>`;
  const provRows = Object.entries(u.providers).sort((a, b) => b[1].input - a[1].input).map(([k, x]) => row(k, x)).join("");
  const modelRows = Object.entries(u.models).sort((a, b) => b[1].input - a[1].input).map(([k, x]) => row(k, x)).join("");
  const bars = u.days.map((d) => `<li><span>${date(d.day).replace(/ \d{4}$/, "")}</span><i style="width:${Math.max(1, (d.output / max) * 100).toFixed(1)}%"></i><b>${short(d.output)}</b></li>`).join("");
  const page = `<!doctype html>
<html lang="en" data-theme="day"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI usage — Santhosh Balaji S</title><meta name="description" content="How many tokens my AI coding agents used, by provider, model and day, from my own records.">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#f4f6f8">
<link rel="canonical" href="https://santhoshbalaji.cloud/usage.html"><link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:title" content="AI usage — Santhosh Balaji S"><meta property="og:type" content="website"><meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${cssPath}"><script src="analytics.js?v=1" defer></script></head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
<header class="project-header"><a class="wordmark" href="index.html" aria-label="Santhosh Balaji S, home"><span class="wordmark-name"><b>Santhosh</b><span>Balaji</span><em>S</em></span><span class="wordmark-role"><i aria-hidden="true"></i>Software Developer</span></a><nav aria-label="Page links"><a href="about.html">← About</a><a href="index.html#contact">Contact ↗</a></nav></header>
<main id="main" class="project-story" style="--active-accent:var(--signal-blue)">
<div class="project-intro"><p class="section-label">AI usage</p><h1>${n(u.total.output)} tokens written by agents.</h1><p class="project-lead">From ${date(u.from)} to ${date(u.to)}, across ${u.threads.toLocaleString("en-GB")} agent threads and ${u.total.turns.toLocaleString("en-GB")} turns. These are my own records, read from the tool I run the agents in.</p></div>
<section class="project-context" aria-labelledby="u1"><div><p class="section-label">Totals</p><h2 id="u1">What the numbers mean.</h2></div><div><ul class="usage-stats"><li><b>${short(u.total.output)}</b><span>Output: what the agents wrote</span></li><li><b>${short(fresh(u.total))}</b><span>New input: what they read for the first time</span></li><li><b>${short(u.total.input)}</b><span>Processed in total, mostly cached re-reads</span></li></ul><p>An agent re-reads its whole conversation on every turn. Those re-reads are cached and billed at a small fraction of the normal rate, which is why the processed total is so much larger than the other two.</p></div></section>
<section aria-labelledby="u2"><p class="section-label">By day</p><h2 id="u2">Output tokens per day.</h2><ol class="usage-days">${bars}</ol></section>
<section aria-labelledby="u3"><p class="section-label">By provider</p><h2 id="u3">Who did the work.</h2><div class="usage-table"><table>${head}<tbody>${provRows}</tbody></table></div></section>
<section aria-labelledby="u4"><p class="section-label">By model</p><h2 id="u4">Where the model was recorded.</h2><div class="usage-table"><table>${head}<tbody>${modelRows}</tbody></table></div><p class="diagram-note">The model name was not recorded for every turn, so this table covers fewer turns than the provider table. Days are in UTC. Updated ${date(u.generatedAt)}.</p></section>
<footer class="project-next"><p>Want this way of working on your project?</p><a class="mission-link" href="work-with-me.html">Work with me →</a><a href="about.html">Back to About</a></footer></main>
<footer class="site-footer"><p>© 2026 Santhosh Balaji S</p><a href="privacy.html">Privacy</a></footer></body></html>`;
  await writeFile("usage.html", page);
}
