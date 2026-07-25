import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const ROOT = "C:/Users/Yuan/Documents/FlyRankAI/Capstones/Social Media Studio";
const OUT = path.join(ROOT, "docs", "images", "shots");
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

async function shotEl(page, selector, name) {
  const el = await page.$(selector);
  if (!el) {
    console.log("missing element for", name, selector);
    return;
  }
  await el.screenshot({ path: path.join(OUT, name), type: "png" });
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

/** Poll until a button with the given text is present (past any skeleton). */
async function waitForButton(page, text, timeout = 15000) {
  await page.waitForFunction(
    (needle) =>
      Array.from(document.querySelectorAll("button")).some((n) =>
        (n.textContent || "").trim().includes(needle)
      ),
    { timeout },
    text
  );
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
  // Wait past the boot skeleton until the real desk form is interactive
  await waitForButton(page, "Make campaign");
  await wait(600);
  await shot(page, "broadcast-firstrun.png");

  // Turn the durable worker heartbeat off so the queued state is observable
  await page.evaluate(() => {
    const box = document.querySelector('input[type="checkbox"]');
    if (box && box.checked) box.click();
  });

  console.log("make campaign:", await clickByText(page, "Make campaign"));
  // Wait for the rendered board (past the board skeleton) before shooting
  await page.waitForSelector(".bc-rail-item", { timeout: 20000 });
  await wait(1500);
  await shot(page, "broadcast-campaign.png");

  // The product metaphor: one master image, the crop each platform takes
  await page.evaluate(() => {
    const el = document.querySelector(".bc-studio");
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140);
  });
  // Hover a rail frame so the crop overlay settles instead of mid-cycle
  await page.hover(".bc-rail-item");
  await wait(1200);
  await shotEl(page, ".bc-studio", "broadcast-frames.png");

  console.log("edit caption:", await clickByText(page, "Edit caption"));
  await wait(900);
  await shotEl(page, ".grid.sm\\:grid-cols-2", "broadcast-caption-edit.png");
  console.log("cancel edit:", await clickByText(page, "Cancel"));
  await wait(600);

  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(600);

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

  // Sandbox controls: prove the signature check rejects a forged delivery
  await page.evaluate(() => {
    const el = document.querySelector(".bc-lab-panel");
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 160);
  });
  await wait(700);
  console.log("forge webhook:", await clickByText(page, "Forge webhook"));
  await wait(1600);
  await shot(page, "broadcast-prove-it.png");
  await shotEl(page, ".bc-lab-panel", "broadcast-sandbox-controls.png");
} finally {
  await browser.close();
}
