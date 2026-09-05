import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { projects } from "../projects.mjs";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
process.chdir(root.pathname);
await mkdir("assets/build", { recursive: true });
await mkdir("work", { recursive: true });
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#000"/><ellipse cx="1030" cy="340" rx="300" ry="190" fill="none" stroke="#242c42"/><ellipse cx="1030" cy="340" rx="390" ry="250" fill="none" stroke="#151c2b"/><circle cx="940" cy="175" r="8" fill="#b8d94b"/><circle cx="1090" cy="511" r="7" fill="#8f78ff"/><text x="80" y="110" fill="#aab7cb" font-family="Helvetica,Arial,sans-serif" font-size="24">SANTHOSH BALAJI S</text><text x="76" y="275" fill="#f2f6ff" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="600">I build systems that</text><text x="76" y="360" fill="#b8c6ff" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="600">hold up in the real world.</text><path d="M80 440H140" stroke="#b8c6ff" stroke-width="2"/><text x="80" y="492" fill="#aab7cb" font-family="Helvetica,Arial,sans-serif" font-size="24">Software developer · Product engineering · Chennai</text><text x="80" y="554" fill="#8c9ab0" font-family="Helvetica,Arial,sans-serif" font-size="22">santhoshbalaji.cloud</text></svg>`)).png().toFile("assets/social-card.png");
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
for (const p of projects) {
  const page = `<!doctype html>
<html lang="en" data-theme="orbital"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.name} — Product notes by Santhosh Balaji S</title><meta name="description" content="${escape(p.lead)}">
<meta name="referrer" content="strict-origin-when-cross-origin"><meta name="theme-color" content="#000000">
<link rel="canonical" href="https://santhoshbalaji.cloud/work/${p.id}.html"><link rel="icon" href="../favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${p.name} — Product notes"><meta property="og:description" content="${escape(p.lead)}"><meta property="og:type" content="article"><meta property="og:image" content="https://santhoshbalaji.cloud/assets/social-card.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../${cssPath}"><script src="../analytics.js?v=1" defer></script></head>
<body class="project-page"><a class="skip-link" href="#main">Skip to content</a>
<header class="project-header"><a href="../index.html#${p.id}">← All projects</a><a href="../index.html#contact">Contact Santhosh ↗</a></header>
<main id="main" class="project-story" style="--active-accent:var(--${p.id})">
<div class="project-intro"><img src="../assets/logos/${p.id}.svg" width="64" height="64" alt=""><p class="section-label">${p.name} / ${p.category}</p><h1>${p.title}</h1><p class="project-lead">${p.lead}</p><p class="project-availability">${p.status}</p>${p.url && !p.unavailable ? `<a class="primary-action" href="${p.url}" target="_blank" rel="noreferrer">${p.next} ↗</a>` : ""}</div>
${p.image ? `<figure class="project-preview"><img src="../${p.image}" alt="${escape(p.imageAlt)}" width="1600" height="640" loading="lazy" decoding="async"><figcaption>${p.imageCaption}</figcaption></figure>` : ""}
<section class="project-context" aria-labelledby="problem"><div><p class="section-label">The problem</p><h2 id="problem">${p.audience}</h2></div><p>${p.problem}</p></section>
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
