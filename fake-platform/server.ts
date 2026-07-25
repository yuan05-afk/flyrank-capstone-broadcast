import http from "http";
import { URL } from "url";
import fs from "fs";
import path from "path";
import { createHmac } from "crypto";

type Post = {
  id: string;
  platform: string;
  caption: string;
  imagePath: string;
  idempotencyKey: string;
  createdAt: string;
};

const PORT = Number(process.env.FAKE_PLATFORM_PORT || 4100);
const SECRET =
  process.env.FAKE_PLATFORM_WEBHOOK_SECRET || "broadcast_webhook_secret_dev";
const APP_HOOK =
  process.env.APP_WEBHOOK_BASE_URL || "http://localhost:3000";
const DATA = path.join(process.cwd(), "fake-platform", "data", "posts.json");

let force429 = process.env.FAKE_PLATFORM_FORCE_429 === "true";
let posts: Post[] = [];

function load() {
  try {
    if (fs.existsSync(DATA)) {
      posts = JSON.parse(fs.readFileSync(DATA, "utf8"));
    }
  } catch {
    posts = [];
  }
}

function save() {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(posts, null, 2));
}

function json(
  res: http.ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...extraHeaders,
  });
  res.end(payload);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

async function deliver(post: Post) {
  const body = JSON.stringify({
    externalPostId: post.id,
    idempotencyKey: post.idempotencyKey,
    platform: post.platform,
    status: "published",
  });
  const url = `${APP_HOOK}/api/webhooks/social-delivery`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Broadcast-Signature": sign(body),
      },
      body,
    });
  } catch (err) {
    console.error("[fake-platform] webhook failed", err);
  }
}

load();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const method = req.method || "GET";

  if (method === "POST" && url.pathname === "/oauth/token") {
    const raw = await readBody(req);
    const data = raw ? JSON.parse(raw) : {};
    const platform = data.platform || "instagram";
    return json(res, 200, {
      access_token: `fake_${platform}_token_${Date.now()}`,
      token_type: "bearer",
    });
  }

  if (method === "POST" && url.pathname === "/admin/force-429") {
    const raw = await readBody(req);
    const data = JSON.parse(raw || "{}");
    force429 = Boolean(data.enabled);
    return json(res, 200, { force429 });
  }

  if (method === "POST" && url.pathname === "/admin/deliver") {
    const raw = await readBody(req);
    const data = JSON.parse(raw || "{}");
    const post = posts.find((p) => p.id === data.externalPostId);
    if (!post) return json(res, 404, { error: "not found" });
    await deliver(post);
    return json(res, 200, { ok: true });
  }

  const publishMatch = url.pathname.match(/^\/v1\/([^/]+)\/posts$/);
  if (publishMatch && method === "POST") {
    if (force429) {
      return json(
        res,
        429,
        { error: "rate_limited" },
        { "Retry-After": "1" }
      );
    }
    const platform = publishMatch[1];
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return json(res, 401, { error: "unauthorized" });
    }
    const key = String(req.headers["idempotency-key"] || "");
    if (!key) return json(res, 400, { error: "idempotency key required" });

    const existing = posts.find(
      (p) => p.platform === platform && p.idempotencyKey === key
    );
    if (existing) {
      return json(res, 200, {
        id: existing.id,
        status: "queued",
        idempotentReplay: true,
      });
    }

    const raw = await readBody(req);
    const data = JSON.parse(raw || "{}");
    const post: Post = {
      id: `fp_${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      platform,
      caption: data.caption || "",
      imagePath: data.imagePath || "",
      idempotencyKey: key,
      createdAt: new Date().toISOString(),
    };
    posts.push(post);
    save();
    // Async delivery shortly after accept
    setTimeout(() => {
      void deliver(post);
    }, 150);
    return json(res, 201, { id: post.id, status: "queued" });
  }

  if (publishMatch && method === "GET") {
    const platform = publishMatch[1];
    return json(
      res,
      200,
      posts.filter((p) => p.platform === platform)
    );
  }

  if (method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, force429, posts: posts.length });
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`[fake-platform] listening on http://localhost:${PORT}`);
});
