/**
 * Capture Broadcast pitch + campaign screenshots into docs/images/.
 * Requires Chrome installed and `pnpm dev` + seeded DB running on :3000.
 */
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const OUT = path.join(process.cwd(), "docs", "images");
const BASE = process.env.APP_URL || "http://localhost:3000";
const KEY = process.env.DEMO_API_KEY || "broadcast_demo_key_001";
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, type: "png", ...opts });
  console.log("wrote", file);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});

try {
  const page = await browser.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3200));
  await shot(page, "broadcast-landing.png");

  // Guarantees / trust section
  await page.evaluate(() => {
    const el =
      document.getElementById("trust-heading") ||
      [...document.querySelectorAll("h2")].find((h) =>
        /publishing promises|verify/i.test(h.textContent || "")
      );
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 170;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await new Promise((r) => setTimeout(r, 1500));
  await shot(page, "broadcast-guarantees.png");

  // Login via same-origin fetch to set cookie
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(async (apiKey) => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
  }, KEY);

  await page.goto(`${BASE}/campaigns`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // Ensure there is a campaign with variants visible
  await page.evaluate(async () => {
    const list = await fetch("/api/campaigns").then((r) => r.json());
    if ((list.campaigns || []).length === 0) {
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Why safe-zone crops matter for social campaigns",
          body: "A single master image rarely survives every platform. Broadcast keeps the subject inside each crop so Instagram squares and X wides still feel intentional.",
          url: "https://example.com/blog/safe-zone-crops",
        }),
      });
    }
  });
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // Click first campaign card if present
  await page.evaluate(() => {
    const btn = document.querySelector("[data-campaign-id], button, a");
    const cards = [...document.querySelectorAll("button, [role='button']")];
    const pick =
      cards.find((c) => /safe-zone|campaign|instagram|Why/i.test(c.textContent || "")) ||
      cards[0];
    if (pick) pick.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  await shot(page, "broadcast-campaign.png");

  // Aspect / board detail - scroll mid page
  await page.evaluate(() => window.scrollBy(0, 320));
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, "broadcast-board.png");

  // Publish one platform for success state
  await page.evaluate(async () => {
    const list = await fetch("/api/campaigns").then((r) => r.json());
    const c = (list.campaigns || [])[0];
    if (!c) return;
    await fetch(`/api/campaigns/${c.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "instagram" }),
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll("button")];
    const pick = cards.find((c) => /safe-zone|Why/i.test(c.textContent || ""));
    if (pick) pick.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  await shot(page, "broadcast-published.png");
} finally {
  await browser.close();
}
