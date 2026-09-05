import { chromium } from "@playwright/test";
import sharp from "sharp";
// Capture the real renderer, not an independently illustrated replacement.
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [width, height, file] of [[1440,900,"universe-preview"],[390,844,"universe-preview-mobile"]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.locator('#gravity-stage[data-three-state="ready"]').waitFor({ timeout: 30000 });
    await page.locator("#gravity-stage").scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      document.querySelector("#motion-control").click();
      document.querySelector("#universe-reset").click();
    });
    await page.addStyleTag({ content: ".hero-copy,.site-header,.flight-rail,.cosmos{visibility:hidden!important}#gravity-stage>*:not(canvas){visibility:hidden!important}#gravity-stage{background:transparent!important}body{background:transparent!important}#universe-render{opacity:1!important}" });
    const png = await page.locator("#universe-render").screenshot({ omitBackground: true });
    await sharp(png).webp({ quality: 86 }).toFile(`assets/${file}.webp`);
    console.log(`Captured ${file} at ${width}px from the live WebGL canvas.`);
    await page.close();
  }
} finally { await browser.close(); }
