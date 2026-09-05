import { test, expect } from "@playwright/test";
const products = ["jurisfield", "atlas", "nammatn", "mapsmith"];

for (const width of [1440, 390]) test(`Atlas live links and project notes at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#atlas");
  const panel = page.locator("#atlas");
  await expect(panel).toBeVisible();
  const visit = panel.getByRole("link", { name: "Visit Atlas" });
  await expect(visit).toBeVisible();
  await expect(visit).toHaveAttribute("href", "https://atlas.santhoshbalaji.cloud/");
  await expect(visit).toHaveAttribute("target", "_blank");
  await expect(visit).toHaveAttribute("rel", "noreferrer");
  await expect(panel).not.toContainText("temporarily unavailable");
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/atlas-restored-panel-${width}.png` });
  await panel.getByRole("link", { name: "Explore the pipeline" }).click();
  await expect(page).toHaveURL(/\/work\/atlas\.html$/);
  await expect(page.getByText("Public product site", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visit Atlas" })).toHaveAttribute("href", "https://atlas.santhoshbalaji.cloud/");
  await expect(page.getByRole("link", { name: "Visit Atlas" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("temporarily unavailable");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/atlas-restored-notes-${width}.png` });
});

test("automatic 3D, depth states, pause, ordinary scrolling and project panels", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#toast")).toBeHidden();
  const stage = page.locator("#gravity-stage");
  await expect(stage).toHaveAttribute("data-three-state", "ready", { timeout: 30000 });
  await expect(stage).toHaveAttribute("aria-busy", "false");
  await expect(stage).not.toHaveAttribute("aria-label", /loading/i);
  await expect(stage).toHaveAttribute("data-three-hit-testing", "analytic-sphere");
  await expect(page.locator(".universe-poster")).toBeHidden();
  await page.locator("#motion-control").click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await page.locator("#universe-render").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  await page.keyboard.press("r");
  await page.mouse.move(1200, 570);
  await page.mouse.wheel(0, 650);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  for (const product of products) {
    await page.locator(`#tab-${product}`).click();
    const panel = page.locator(`#${product}`);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS("opacity", "1");
    await expect(panel.locator(".project-flow li")).toHaveCount(3);
    await expect(panel.locator(".mission-link")).toHaveAttribute("href", `work/${product}.html`);
    await expect(page).toHaveURL(new RegExp(`#${product}$`));
  }
  for (const career of ["zoho", "forest", "independent"]) {
    await page.locator(`#career-tab-${career}`).click();
    await expect(page.locator(`#career-${career}`)).toBeVisible();
    await expect(page.locator(`#career-${career}`)).toHaveCSS("opacity", "1");
  }
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-three-visible", "false");
  const frames = await stage.getAttribute("data-three-frames");
  await page.waitForTimeout(1500);
  expect(await stage.getAttribute("data-three-frames")).toBe(frames);
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 768]) test(`mobile controls, menu dismissal and no overflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/");
  await page.locator("#menu-button").click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-nav")).toBeHidden();
  await expect(page.locator("#menu-button")).toBeFocused();
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-state", "ready", { timeout: 30000 });
  await page.locator(".stage-motion").scrollIntoViewIfNeeded();
  await page.locator(".stage-motion").click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  for (const product of products) {
    await page.locator(`#tab-${product}`).click();
    await expect(page.locator(`#${product}`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator("#contact").scrollIntoViewIfNeeded();
  const email = page.locator(".contact-email strong");
  const bounds = await email.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  await page.screenshot({ path: `test-results/mobile-${width}.png`, fullPage: true });
});

test("reduced motion and data saver retain an accessible fallback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#mapsmith");
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-state", "fallback");
  await expect(page.locator("#mapsmith")).toBeVisible();
  await expect(page.locator("#mapsmith")).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true } }));
  await page.goto("/");
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-fallback", "data-saver");
});

test("loading preview persists until textures are ready and errors expose a fallback", async ({ page }) => {
  await page.route("**/assets/textures/earth-color.webp", async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".universe-poster")).toBeVisible();
  await expect(page.locator(".gravity-core")).toBeHidden();
  await expect(page.locator("#toast")).toBeHidden();
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-state", "ready", { timeout: 30000 });
  await page.unrouteAll();
  await page.route("**/assets/textures/earth-color.webp", route => route.abort());
  await page.reload();
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-state", "fallback");
  await expect(page.locator("#universe-activate")).toBeEnabled();
});

test("copy failure is not reported as a successful copy", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } });
    document.execCommand = () => false;
  });
  await page.goto("/");
  await page.locator("#copy-email").click();
  await expect(page.locator("#toast")).toBeVisible();
  await expect(page.locator("#toast")).not.toContainText("copied");
});

test("project notes and privacy render without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const product of products) {
    const response = await page.goto(`http://127.0.0.1:4173/work/${product}.html`);
    expect(response.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".project-flow li")).toHaveCount(3);
  }
  await page.goto("http://127.0.0.1:4173/");
  for (const product of products) await expect(page.locator(`#${product}`)).toBeVisible();
  await page.goto("http://127.0.0.1:4173/privacy.html");
  await expect(page.locator("h1")).toBeVisible();
  await context.close();
});
