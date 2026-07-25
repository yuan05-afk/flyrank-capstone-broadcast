import { beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { PLATFORM_SPECS, PLATFORM_KEYS } from "@/config/platform-specs";
import {
  buildAllVariants,
  computeCrop,
  subjectRect,
} from "@/lib/images/variants";
import { composeCaption } from "@/config/social-prompts.config";
import { verifySignature, signPayload } from "@/lib/webhooks/signature";
import { FakeHttpPublisher } from "@/publishers/FakeHttpPublisher";

const FAKE = process.env.FAKE_PLATFORM_URL || "http://localhost:4100";
const SECRET =
  process.env.FAKE_PLATFORM_WEBHOOK_SECRET || "broadcast_webhook_secret_dev";

async function waitForFake(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${FAKE}/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("fake platform not reachable - start with pnpm dev:fake");
}

describe("caption fragments", () => {
  it("produces different captions per platform", () => {
    const post = {
      title: "Safe-zone crops",
      body: "Keep the subject centered so every crop still feels intentional.",
      url: "https://example.com/a",
    };
    const ig = composeCaption("instagram", post);
    const x = composeCaption("x", post);
    expect(ig).not.toEqual(x);
    expect(ig.toLowerCase()).toContain("broadcast");
    expect(x).toContain("https://example.com/a");
  });
});

describe("image variants", () => {
  it("outputs correct dimensions for instagram and x", async () => {
    const dir = path.join(process.cwd(), "storage", "variants", "test-dims");
    fs.rmSync(dir, { recursive: true, force: true });
    const paths = await buildAllVariants("test-dims", ["instagram", "x"], {
      title: "Safe-zone crops for every platform",
      body: "One master image, two intentional frames.",
      url: "https://example.com/blog/safe-zone-crops",
    });
    for (const key of ["instagram", "x"] as const) {
      const meta = await sharp(paths[key]).metadata();
      expect(meta.width).toBe(PLATFORM_SPECS[key].width);
      expect(meta.height).toBe(PLATFORM_SPECS[key].height);
    }
  });

  it("keeps the subject inside every platform crop", () => {
    const sw = 2000;
    const sh = 2000;
    const subject = subjectRect(sw, sh);
    for (const key of PLATFORM_KEYS) {
      const crop = computeCrop(sw, sh, key);
      expect(subject.left).toBeGreaterThanOrEqual(crop.left);
      expect(subject.top).toBeGreaterThanOrEqual(crop.top);
      expect(subject.left + subject.width).toBeLessThanOrEqual(crop.left + crop.width);
      expect(subject.top + subject.height).toBeLessThanOrEqual(crop.top + crop.height);
    }
  });
});

describe("webhook signatures", () => {
  it("accepts valid signatures and rejects forgeries", () => {
    const body = JSON.stringify({ hello: "world" });
    const good = signPayload(SECRET, body);
    expect(verifySignature(SECRET, body, good)).toBe(true);
    expect(verifySignature(SECRET, body, "deadbeef")).toBe(false);
    expect(verifySignature(SECRET, body, null)).toBe(false);
  });
});

describe("fake platform publish", () => {
  beforeAll(async () => {
    await waitForFake();
    await fetch(`${FAKE}/admin/force-429`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
  });

  it("is idempotent for the same key", async () => {
    const tokenRes = await fetch(`${FAKE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "instagram" }),
    });
    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };
    const publisher = new FakeHttpPublisher({
      platform: "instagram",
      getToken: async () => access_token,
    });
    const key = `test_idem_${Date.now()}`;
    const a = await publisher.publish({
      platform: "instagram",
      caption: "one",
      imagePath: "x.png",
      idempotencyKey: key,
    });
    const b = await publisher.publish({
      platform: "instagram",
      caption: "two",
      imagePath: "x.png",
      idempotencyKey: key,
    });
    expect(a.externalPostId).toBe(b.externalPostId);

    const list = await fetch(`${FAKE}/v1/instagram/posts`);
    const posts = (await list.json()) as Array<{ idempotencyKey: string }>;
    expect(posts.filter((p) => p.idempotencyKey === key)).toHaveLength(1);
  });

  it("honors 429 Retry-After then succeeds", async () => {
    await fetch(`${FAKE}/admin/force-429`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });

    const tokenRes = await fetch(`${FAKE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "x" }),
    });
    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };
    const publisher = new FakeHttpPublisher({
      platform: "x",
      getToken: async () => access_token,
      maxRetries: 5,
    });

    const key = `test_429_${Date.now()}`;
    const started = Date.now();

    // Disable 429 after ~1s so the client backoff can succeed
    setTimeout(() => {
      void fetch(`${FAKE}/admin/force-429`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
    }, 1100);

    const result = await publisher.publish({
      platform: "x",
      caption: "rate limit path",
      imagePath: "x.png",
      idempotencyKey: key,
    });

    expect(result.externalPostId).toBeTruthy();
    expect(Date.now() - started).toBeGreaterThanOrEqual(1000);

    await fetch(`${FAKE}/admin/force-429`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
  });
});
