import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const ROOT = "C:/Users/Yuan/Documents/FlyRankAI/Capstones/Social Media Studio";
const OUT = path.join(ROOT, "docs", "images");
const BASE = "http://localhost:3000";
const KEY = "broadcast_demo_key_001";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), type: "png" });
  console.log("wrote", name);
}

async function clickByText(page, text) {
  return page.evaluate((needle) => {
    const hit = Array.from(document.querySelectorAll("button")).find((n) =>
      (n.textContent || "").trim().includes(needle)
    );
    if (hit) {
      hit.click();
      return true;
    }
    return false;
  }, text);
}

try {
  const page = await browser.newPage();

  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 60000 });
  await wait(3200);
  await shot(page, "broadcast-landing.png");

  await page.evaluate(() => {
    const el = document.getElementById("trust-heading");
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 170);
  });
  await wait(1500);
  await shot(page, "broadcast-guarantees.png");

  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.evaluate(async (apiKey) => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const list = await fetch("/api/campaigns").then((r) => r.json());
    for (const c of list.campaigns || []) {
      await fetch("/api/campaigns/" + c.id, { method: "DELETE" });
    }
  }, KEY);

  await page.goto(BASE + "/campaigns", { waitUntil: "networkidle2" });
  await wait(1200);

  // Turn the durable worker heartbeat off so the queued state is observable
  await page.evaluate(() => {
    const box = document.querySelector('input[type="checkbox"]');
    if (box && box.checked) box.click();
  });

  console.log("make campaign:", await clickByText(page, "Make campaign"));
  await wait(5000);
  await shot(page, "broadcast-campaign.png");

  console.log("queue:", await clickByText(page, "Queue"));
  await wait(1600);
  await shot(page, "broadcast-scheduled.png");

  console.log("tick:", await clickByText(page, "Tick worker"));
  await wait(4000);
  console.log("publish all:", await clickByText(page, "Publish all"));
  await wait(5000);
  await shot(page, "broadcast-published.png");

  await page.evaluate(() => window.scrollBy(0, 380));
  await wait(900);
  await shot(page, "broadcast-board.png");
} finally {
  await browser.close();
}
