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
      // Replays create nothing new, but the platform still reports current state.
      setTimeout(() => {
        void deliver(existing);
      }, 150);
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

  const postMatch = url.pathname.match(/^\/v1\/([^/]+)\/posts\/([^/]+)$/);
  if (postMatch && method === "GET") {
    const platform = postMatch[1];
    const id = decodeURIComponent(postMatch[2]);
    const post = posts.find((p) => p.platform === platform && p.id === id);
    if (!post) return json(res, 404, { error: "not found" });

    const wantsJson =
      url.searchParams.get("format") === "json" ||
      (req.headers.accept || "").includes("application/json");
    if (wantsJson) {
      return json(res, 200, {
        ...post,
        permalink: `http://localhost:${PORT}/v1/${platform}/posts/${encodeURIComponent(post.id)}`,
      });
    }

    const cleaned = post.imagePath.replace(/^storage\/variants\//, "");
    const imageUrl = cleaned
      ? `${APP_HOOK}/api/media/${cleaned}`
      : "";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(post.platform)} · ${escapeHtml(post.id)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: Figtree, system-ui, sans-serif; background: #F7F8FC; color: #101828;
    }
    main {
      width: min(420px, calc(100vw - 2rem)); background: #fff; border: 1px solid #E4E7EC;
      border-radius: 1rem; overflow: hidden; box-shadow: 0 12px 40px rgba(16,24,40,.06);
    }
    .bar {
      display: flex; justify-content: space-between; align-items: center; gap: .75rem;
      padding: .75rem 1rem; border-bottom: 1px solid #E4E7EC; font-size: .75rem;
    }
    .chip {
      font-family: ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase;
      color: #E11D48; font-weight: 600;
    }
    .ok { color: #15803D; font-weight: 600; }
    figure { margin: 0; background: #0f172a; }
    img { display: block; width: 100%; height: auto; }
    .body { padding: 1rem; display: grid; gap: .75rem; }
    p { margin: 0; white-space: pre-wrap; line-height: 1.45; font-size: .95rem; }
    dl { margin: 0; font-family: ui-monospace, monospace; font-size: .7rem; color: #667085; display: grid; gap: .25rem; }
    a { color: #E11D48; }
  </style>
</head>
<body>
  <main>
    <div class="bar">
      <span class="chip">${escapeHtml(post.platform)} fake feed</span>
      <span class="ok">published</span>
    </div>
    ${
      imageUrl
        ? `<figure><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.platform)} published variant" /></figure>`
        : ""
    }
    <div class="body">
      <p>${escapeHtml(post.caption)}</p>
      <dl>
        <div>id ${escapeHtml(post.id)}</div>
        <div>key ${escapeHtml(post.idempotencyKey)}</div>
        <div>created ${escapeHtml(post.createdAt)}</div>
      </dl>
    </div>
  </main>
</body>
</html>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, force429, posts: posts.length });
  }

  json(res, 404, { error: "not found" });
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

server.listen(PORT, () => {
  console.log(`[fake-platform] listening on http://localhost:${PORT}`);
});
