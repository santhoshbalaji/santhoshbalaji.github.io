import { test, expect } from "@playwright/test";

test("full orbital cycle retains product identity and coherent depth states", async ({ page }) => {
  test.setTimeout(110000);
  await page.goto("/");
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-state", "ready", { timeout: 30000 });
  const observed = Object.fromEntries(["jurisfield","atlas","nammatn","mapsmith"].map(key=>[key,new Set()]));
  for (let second = 0; second < 72; second += 4) {
    const states = await page.locator("[data-orbit-planet]").evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.orbitPlanet, depth:n.dataset.depthState, logo:n.dataset.logoDepthState, hidden:n.getAttribute("aria-hidden"), bounds:n.getBoundingClientRect().toJSON()})));
    for (const s of states) {
      observed[s.key].add(s.depth);
      expect(s.logo).toBe(s.depth === "behind-earth" ? "hidden-behind-earth" : "front-visible");
      expect(s.hidden).toBe(String(s.depth === "behind-earth"));
      expect(Number.isFinite(s.bounds.x)).toBe(true);
    }
    if (second % 12 === 0) await page.screenshot({path:`test-results/orbit-${String(second).padStart(2,"0")}.png`});
    await page.waitForTimeout(4000);
  }
  for (const [key, states] of Object.entries(observed)) expect(states.has("visible"), `${key} is visible during its orbit`).toBe(true);
  expect(Object.values(observed).some(states=>states.has("behind-earth"))).toBe(true);
  await page.locator("#motion-control").click();
  await page.locator("#universe-render").focus();
  for (let i=0;i<54;i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1500);
  await page.screenshot({path:"test-results/orbit-360.png"});
  await page.locator("#universe-reset").click();
  await page.screenshot({path:"test-results/orbit-reset.png"});
});

test("capture project, experience, contact and mobile layouts", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-state", "ready", { timeout: 30000 });
  await page.locator("#motion-control").click();
  await page.screenshot({path:"test-results/desktop-hero.png"});
  for (const product of ["jurisfield","atlas","nammatn","mapsmith"]) {
    await page.locator(`#tab-${product}`).click();
    await page.locator("#mission-explorer").screenshot({path:`test-results/product-${product}.png`});
  }
  await page.locator("#experience").screenshot({path:"test-results/experience.png"});
  await page.locator("#contact").screenshot({path:"test-results/contact.png"});
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.locator("#gravity-stage")).toHaveAttribute("data-three-state", "ready", { timeout: 30000 });
  await page.screenshot({path:"test-results/phone-hero.png"});
  await page.locator(".stage-motion").scrollIntoViewIfNeeded();
  await page.locator(".stage-motion").click();
  await page.screenshot({path:"test-results/phone-orbits.png"});
  await page.locator("#tab-nammatn").click();
  await page.locator("#mission-explorer").screenshot({path:"test-results/phone-project.png"});
  await page.goto("/work/nammatn.html");
  await page.screenshot({path:"test-results/phone-project-notes.png"});
});
