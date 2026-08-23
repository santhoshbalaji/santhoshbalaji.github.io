import { access, readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const theme = await readFile(new URL("../theme.css", import.meta.url), "utf8");
const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
const universe = await readFile(new URL("../three-universe.js", import.meta.url), "utf8");
const analytics = await readFile(new URL("../analytics.js", import.meta.url), "utf8");
const privacy = await readFile(new URL("../privacy.html", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const cname = await readFile(new URL("../CNAME", import.meta.url), "utf8");
const logoPaths = ["jurisfield.svg", "atlas.svg", "nammatn.svg", "mapsmith.svg", "zoho-official.svg", "forest-work.svg"];
let logosPresent = true;
try {
  await Promise.all(logoPaths.map((name) => access(new URL(`../assets/logos/${name}`, import.meta.url))));
} catch {
  logosPresent = false;
}
let profilePresent = true;
try {
  await access(new URL("../assets/profile/santhosh-balaji.jpg", import.meta.url));
} catch {
  profilePresent = false;
}
let brandPresent = true;
let brandSvg = "";
try {
  brandSvg = await readFile(new URL("../favicon.svg", import.meta.url), "utf8");
} catch {
  brandPresent = false;
}
let earthPresent = true;
try {
  await access(new URL("../assets/earth-cloudless-surface.jpg", import.meta.url));
} catch {
  earthPresent = false;
}
let galaxyPresent = true;
try {
  await access(new URL("../assets/galaxy-black-field.jpg", import.meta.url));
} catch {
  galaxyPresent = false;
}
let noJekyllPresent = true;
try {
  await access(new URL("../.nojekyll", import.meta.url));
} catch {
  noJekyllPresent = false;
}
let threeRuntimePresent = true;
try {
  await Promise.all([
    access(new URL("../vendor/three.module.min.js", import.meta.url)),
    access(new URL("../vendor/three.core.min.js", import.meta.url)),
  ]);
} catch {
  threeRuntimePresent = false;
}

const checks = [
  [html.includes("<title>Santhosh Balaji S — Software Developer</title>"), "document has a developer-focused title"],
  [html.includes('<link rel="canonical" href="https://santhoshbalaji.cloud/"') && html.includes('<meta property="og:url" content="https://santhoshbalaji.cloud/"'), "canonical production domain metadata is wired"],
  [html.includes('id="main"'), "document has a main landmark"],
  [html.includes('href="#work"') && html.includes('id="work"'), "work anchor resolves"],
  [html.includes('href="#experience"') && html.includes('id="experience"'), "experience anchor resolves"],
  [html.includes('href="#contact"') && html.includes('id="contact"'), "contact anchor resolves"],
  [html.includes("mailto:contact@santhoshbalaji.cloud") && html.includes('data-email="contact@santhoshbalaji.cloud"') && !html.includes("santhoshbalaji7676@gmail.com"), "contact email is wired"],
  [html.includes("https://x.com/SanthoshBala_S") && html.includes("https://linkedin.com/in/santhoshbalajis") && html.includes("https://github.com/santhoshbalaji") && html.includes('class="social-links"') && html.includes('class="footer-links"'), "social profiles are linked in contact and footer"],
  [html.includes('href="privacy.html"') && privacy.includes("<title>Privacy — Santhosh Balaji S</title>") && privacy.includes('href="index.html"'), "privacy notice is linked and provides a clear return path"],
  [privacy.includes("Analytics cookies</dt><dd>None") && privacy.includes("Advertising</dt><dd>None") && privacy.includes("Visitor profiles</dt><dd>None") && privacy.includes("Global Privacy Control") && privacy.includes("Do Not Track") && privacy.includes("unsampled beacon data for seven days") && privacy.includes("previous six months"), "privacy notice states the no-cookie boundary, retention, and browser choices"],
  [html.includes('src="analytics.js?v=1"') && privacy.includes('src="analytics.js?v=1"') && analytics.includes('window.location.hostname === "santhoshbalaji.cloud"') && analytics.includes("static.cloudflareinsights.com/beacon.min.js"), "cookieless analytics is loaded only through the production guard"],
  [analytics.includes("navigator.globalPrivacyControl === true") && analytics.includes('navigator.doNotTrack === "1"') && analytics.includes('window.doNotTrack === "1"') && analytics.includes('navigator.msDoNotTrack === "1"'), "analytics honors Global Privacy Control and Do Not Track signals"],
  [![html, privacy, analytics, script].some((source) => /document\.cookie|localStorage|sessionStorage|googletagmanager|google-analytics\.com|connect\.facebook\.net|clarity\.ms|hotjar/i.test(source)), "site code contains no cookie, browser-storage, advertising, or invasive analytics hooks"],
  [html.includes("JurisField") && html.includes("Atlas") && html.includes("NammaTN") && html.includes("MapSmith"), "all four systems are presented"],
  [html.includes("https://atlas.santhoshbalaji.cloud/") && html.includes("https://nammatn.in/"), "live product URLs are configured"],
  [html.includes("Zoho Corporation") && html.includes("Tamil Nadu Forest Department") && html.includes("Founder &amp; Product Engineer"), "career trajectory is represented"],
  [html.includes('assets/logos/zoho-official.svg?v=1') && html.includes('assets/logos/forest-work.svg?v=1') && html.includes('class="career-brand career-brand-zoho"') && html.includes('class="career-brand career-brand-forest"'), "career trace uses the official Zoho mark and an original forest symbol"],
  [html.includes("Zoho is a trademark of Zoho Corporation Private Limited and/or its affiliates.") && html.includes("no endorsement is implied") && !html.toLowerCase().includes("tamil-nadu-government-emblem"), "career trademark attribution and non-endorsement notice are present"],
  [(html.includes("8 years") || html.includes("Eight years")) && !html.includes("Political Science") && !html.includes("CURRENT STUDY"), "career remains concise and education content is removed"],
  [!html.includes(".pdf") && !html.includes("Résumé"), "PDF and resume download content are removed"],
  [logosPresent && logoPaths.every((name) => html.includes(`assets/logos/${name}`)), "canonical product logos are present and linked"],
  [profilePresent && html.includes('class="hero-identity"') && html.includes('class="identity-portrait"') && html.includes('alt="Portrait of Santhosh Balaji S"'), "portrait is integrated as a restrained editorial identity lockup"],
  [brandPresent && brandSvg.includes("A restrained geometric S favicon with a cobalt terminal") && !brandSvg.includes("brace") && !brandSvg.includes("bracket") && html.includes('class="wordmark-name"') && html.includes('<b>Santhosh</b><span>Balaji</span><em>S</em>') && html.includes('class="wordmark-role"') && html.includes('href="favicon.svg?v=10"') && !html.includes('class="brand-mark"') && !html.includes('santhosh-build-path.svg') && !html.includes('sb-developer-mark.svg') && !html.includes('sb-code-mark.svg') && css.includes(".wordmark-name") && css.includes(".wordmark-role"), "custom typographic wordmark replaces all standalone developer symbols"],
  [html.includes('data-theme="orbital"') && html.includes('href="theme.css?v=4"'), "centralized orbital theme is loaded"],
  [theme.includes("--space-void") && theme.includes("--starlight") && theme.includes("--solar") && theme.includes("--aurora") && theme.includes("--earth-atmosphere"), "space theme exposes semantic design tokens"],
  [!/#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/i.test(css), "component stylesheet consumes centralized color tokens"],
  [html.includes('id="starfield"') && script.includes("animateStarfield"), "depth-responsive canvas starfield is wired"],
  [galaxyPresent && css.includes('url("assets/galaxy-black-field.jpg")') && css.includes("#starfield") && !html.includes('class="galactic-plane"') && !html.includes('class="distant-world"'), "pitch-black generated galaxy image replaces the synthetic purple background objects"],
  [css.includes("font-size: clamp(3.5rem, 5.35vw, 6.1rem)") && css.includes("font-size: clamp(2.65rem, 10.8vw, 3.45rem)"), "hero headline scale is reduced across desktop and mobile"],
  [theme.includes("--space-void: #000000") && css.includes(".work-section { overflow: hidden; padding-bottom: clamp(3rem,5vw,5rem); background: transparent; }") && css.includes(".contact-section { display: grid; grid-template-columns: 0.9fr 1.1fr; align-items: center; min-height: 39rem; overflow: hidden; background: transparent;") && css.includes("background: transparent; font: 580 0.5rem var(--font-orbit);"), "pitch-black galaxy canvas continues behind every page section"],
  [html.includes('theme.css?v=4') && html.includes('styles.css?v=50') && privacy.includes('styles.css?v=39'), "continuous background theme assets are cache-busted"],
  [script.includes("twinkle") && script.includes("spark") && script.includes("const flare"), "stars include restrained twinkle and bright-star diffraction"],
  [html.includes('id="gravity-stage"') && html.includes('class="system-object object-jurisfield'), "interactive gravity system is present"],
  [(html.match(/data-orbit-planet=/g) || []).length === 4 && (html.match(/data-orbit-path=/g) || []).length === 4 && script.includes("updateProductOrbits") && script.includes("orbitalElapsed"), "four independently animated product orbits are wired"],
  [packageJson.dependencies?.three === "0.185.1" && threeRuntimePresent && html.includes('id="universe-render"') && html.includes('type="module" src="three-universe.js?v=16"') && universe.includes('from "./vendor/three.module.min.js"'), "pinned, locally hosted Three.js runtime powers the 3D product orrery"],
  [universe.includes("new THREE.SphereGeometry(0.52, 128, 64)") && universe.includes("THREE.MeshPhysicalMaterial") && universe.includes("THREE.ACESFilmicToneMapping") && universe.includes("THREE.SRGBColorSpace") && universe.includes("texture.offset.x = 0.469"), "India-facing Earth uses high-segment geometry, color management, and physical lighting"],
  [universe.includes("createProductUniverse") && universe.includes("new THREE.PerspectiveCamera") && universe.includes("new THREE.Raycaster") && universe.includes("ResizeObserver") && css.includes(".has-three-universe .solar-orbits { visibility: hidden; opacity: 0; }") && universe.includes('stage.classList.add("has-three-universe", "has-product-orrery")') && script.includes('gravityStage.classList.contains("has-three-universe")') && script.includes('CustomEvent("motion:change"') && universe.includes('addEventListener("motion:change"'), "perspective 3D scene keeps Earth and the four products as the complete foreground system"],
  [universe.includes('stage.dataset.threeDepth = "product-orbits"') && universe.includes('stage.dataset.portfolioBodies = "earth-jurisfield-atlas-nammatn-mapsmith"') && universe.includes("const orbitSpecs = [") && universe.includes("depthField") && html.includes("Product orrery / 4 worlds") && html.includes("Earth-centred · fully interactive") && !html.includes("Solar system / 8 planets") && !html.includes('class="asteroid-belt"'), "the visible 3D model contains only Earth and the four portfolio products"],
  [css.includes("object-fit: contain") && ["jurisfield", "atlas", "nammatn", "mapsmith"].every((product) => css.includes(`.has-product-orrery .object-${product} .object-logo`)) && !css.includes(".has-product-orrery .system-object .object-logo { width: 48%; height: 48%; padding"), "each product world preserves its native logo geometry without a generic enclosing plate"],
  [universe.includes('stage.dataset.threeInteraction = "360-product-orbits"') && universe.includes("activePointers") && universe.includes("pinchStartDistance") && universe.includes("pinching") && universe.includes("angularVelocityX") && universe.includes("occlusionRaycaster") && universe.includes("targetRotationY += 0.12") && !universe.includes("targetRotationY = THREE.MathUtils.clamp") && universe.includes('addEventListener("pointerdown"') && universe.includes('addEventListener("wheel"') && universe.includes('addEventListener("dblclick"') && universe.includes('addEventListener("keydown"') && universe.includes('resetButton?.addEventListener("click", resetView)') && universe.includes("IntersectionObserver") && universe.includes("rendererPixelRatio") && css.includes("touch-action: none") && css.includes(".system-object.is-occluded") && html.includes('id="universe-reset"') && html.includes("Drag 360°") && html.includes('tabindex="0"') && html.includes('role="application"'), "product orrery supports unrestricted 360-degree drag and keyboard rotation, inertia, pinch and wheel zoom, depth occlusion, direct reset, adaptive rendering, hover, and selection"],
  [html.includes('id="orbit-readout-name"') && html.includes('data-active-orbit="jurisfield"') && script.includes("setActiveOrbit"), "stable active-world telemetry is wired"],
  [script.includes('const activeOrbitOrder = ["jurisfield", "atlas", "nammatn", "mapsmith"]') && script.includes("const activeOrbitCycleMs = 3200") && script.includes("scheduleActiveOrbitCycle") && script.includes("activeOrbitInteractionLocked") && script.includes("stopActiveOrbitCycle"), "active world cycles round-robin every 3.2 seconds with interaction and motion safeguards"],
  [earthPresent && html.includes('id="earth-render"') && html.includes('data-focus="India"') && html.includes('data-texture="assets/earth-cloudless-surface.jpg"') && html.includes("India-facing, cloud-free Blue Marble") && html.includes("orbiting an India-facing Earth") && script.includes("renderCloudlessEarth") && script.includes("const earthFocus = { latitude: 20.6, longitude: 78.9 }") && script.includes("const specular") && script.includes("const atmosphere") && universe.includes("texture.offset.x = 0.469") && !script.includes("centreLongitude = 48") && !html.includes('src="assets/earth-blue-marble.jpg"'), "Earth remains the realistically lit, cloud-free, India-facing hub for the product system"],
  [html.includes('id="mission-explorer"') && html.includes('class="mission-emblem"') && html.includes('class="mission-number"') && !html.includes('class="planet-viewport"'), "editorial mission index and engineering dossier are present"],
  [html.includes('id="motion-control"') && script.includes("setMotion"), "user motion control is wired"],
  [html.includes('script.js?v=20'), "round-robin interaction script is cache-busted"],
  [cname.trim() === "santhoshbalaji.cloud" && noJekyllPresent, "GitHub Pages custom domain files are present"],
  [html.includes('class="career-trace reveal"') && html.includes('data-active-career="independent"') && html.includes('aria-orientation="horizontal"') && html.includes('class="career-note"') && !html.includes('class="experience-section"') && !css.includes(".career-path::before") && script.includes("careerTrace.dataset.activeCareer"), "subtle embedded career trace is wired without text-crossing rails"],
  [!html.includes('class="hero-manifest"') && !css.includes(".hero-manifest"), "hero controls are free of absolute stat overlays"],
  [css.includes("@media (max-width: 760px)") && css.includes(".career-trace { grid-template-columns: 1fr;"), "career trace collapses before its minimum columns can clip"],
  [html.includes('role="tablist"') && html.includes('role="tabpanel"') && script.includes("selectProject"), "interactive product browser is wired"],
  [html.includes('id="menu-button"') && script.includes("aria-expanded"), "mobile navigation is wired"],
  [!html.includes("runtime") && !html.includes("terminal") && !html.includes("system.graph"), "artificial runtime decoration is removed"],
  [css.includes("prefers-reduced-motion"), "reduced-motion preferences are supported"],
  [css.includes(":focus-visible"), "keyboard focus states are present"],
  [!html.includes("TODO") && !script.includes("TODO"), "no TODO placeholders remain"],
];

let failed = false;
for (const [passed, label] of checks) {
  console.log(`${passed ? "✓" : "✗"} ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
