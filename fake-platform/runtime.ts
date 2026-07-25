import { createHmac } from "crypto";

export type FakePost = {
  id: string;
  platform: string;
  caption: string;
  imagePath: string;
  idempotencyKey: string;
  createdAt: string;
};

type FakeState = {
  force429: boolean;
  posts: FakePost[];
};

const globalKey = "__broadcast_fake_platform__";

function state(): FakeState {
  const g = globalThis as typeof globalThis & { [globalKey]?: FakeState };
  if (!g[globalKey]) {
    g[globalKey] = { force429: process.env.FAKE_PLATFORM_FORCE_429 === "true", posts: [] };
  }
  return g[globalKey]!;
}

function secret() {
  return process.env.FAKE_PLATFORM_WEBHOOK_SECRET || "broadcast_webhook_secret_dev";
}

function appHook() {
  return (
    process.env.APP_WEBHOOK_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function publicBase(requestUrl: string) {
  try {
    return new URL(requestUrl).origin;
  } catch {
    return appHook();
  }
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Prefer in-process calls on Vercel: serverless cannot reach localhost:4100. */
export function useInAppFakePlatform(): boolean {
  // Vercel always wins. Local `.env` often sets FAKE_PLATFORM_URL=localhost:4100,
  // and Next loads that file at runtime when the var is unset in the project.
  if (process.env.VERCEL) return true;
  const flag = (process.env.FAKE_PLATFORM_IN_APP || "").trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  return false;
}

/**
 * Call the fake platform either in-process (Vercel / FAKE_PLATFORM_IN_APP) or
 * over HTTP (local `pnpm dev:fake` on port 4100).
 */
export async function fakePlatformFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (useInAppFakePlatform()) {
    const request = new Request(
      `http://broadcast.local/api/fake-platform${normalized}`,
      init
    );
    const segments = normalized.replace(/^\//, "").split("/").filter(Boolean);
    return handleFakePlatform(request, segments);
  }
  const base = resolveFakePlatformUrl();
  return fetch(`${base}${normalized}`, init);
}

async function deliver(post: FakePost) {
  const payload = {
    externalPostId: post.id,
    idempotencyKey: post.idempotencyKey,
    platform: post.platform,
    status: "published" as const,
  };
  try {
    if (useInAppFakePlatform()) {
      // Avoid serverless self-fetch; apply the same delivery path in-process.
      const { campaignService } = await import("@/services/campaign.service");
      await campaignService.applyDelivery(payload);
      return;
    }
    const body = JSON.stringify(payload);
    const url = `${appHook()}/api/webhooks/social-delivery`;
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

function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return Response.json(body, { status, headers });
}

/**
 * In-app fake social platform used on Vercel (and optionally locally).
 * Mirrors fake-platform/server.ts routes under /api/fake-platform/*.
 */
export async function handleFakePlatform(
  request: Request,
  segments: string[]
): Promise<Response> {
  const method = request.method.toUpperCase();
  const pathname = "/" + segments.join("/");
  const url = new URL(request.url);
  const store = state();

  if (method === "POST" && pathname === "/oauth/token") {
    const data = (await request.json().catch(() => ({}))) as { platform?: string };
    const platform = data.platform || "instagram";
    return json(200, {
      access_token: `fake_${platform}_token_${Date.now()}`,
      token_type: "bearer",
    });
  }

  if (method === "POST" && pathname === "/admin/force-429") {
    const data = (await request.json().catch(() => ({}))) as { enabled?: boolean };
    store.force429 = Boolean(data.enabled);
    return json(200, { force429: store.force429 });
  }

  if (method === "POST" && pathname === "/admin/deliver") {
    const data = (await request.json().catch(() => ({}))) as { externalPostId?: string };
    const post = store.posts.find((p) => p.id === data.externalPostId);
    if (!post) return json(404, { error: "not found" });
    await deliver(post);
    return json(200, { ok: true });
  }

  const publishMatch = pathname.match(/^\/v1\/([^/]+)\/posts$/);
  if (publishMatch && method === "POST") {
    if (store.force429) {
      return json(429, { error: "rate_limited" }, { "Retry-After": "1" });
    }
    const platform = publishMatch[1];
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return json(401, { error: "unauthorized" });
    }
    const key = request.headers.get("idempotency-key") || "";
    if (!key) return json(400, { error: "idempotency key required" });

    const existing = store.posts.find(
      (p) => p.platform === platform && p.idempotencyKey === key
    );
    if (existing) {
      // Await on serverless so the delivery finishes before the isolate freezes.
      if (useInAppFakePlatform()) await deliver(existing);
      else void deliver(existing);
      return json(200, {
        id: existing.id,
        status: "queued",
        idempotentReplay: true,
      });
    }

    const data = (await request.json().catch(() => ({}))) as {
      caption?: string;
      imagePath?: string;
    };
    const post: FakePost = {
      id: `fp_${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      platform,
      caption: data.caption || "",
      imagePath: data.imagePath || "",
      idempotencyKey: key,
      createdAt: new Date().toISOString(),
    };
    store.posts.push(post);
    if (useInAppFakePlatform()) await deliver(post);
    else void deliver(post);
    return json(201, { id: post.id, status: "queued" });
  }

  if (publishMatch && method === "GET") {
    const platform = publishMatch[1];
    return json(
      200,
      store.posts.filter((p) => p.platform === platform)
    );
  }

  const postMatch = pathname.match(/^\/v1\/([^/]+)\/posts\/([^/]+)$/);
  if (postMatch && method === "GET") {
    const platform = postMatch[1];
    const id = decodeURIComponent(postMatch[2]);
    const post = store.posts.find((p) => p.platform === platform && p.id === id);
    if (!post) return json(404, { error: "not found" });

    const wantsJson =
      url.searchParams.get("format") === "json" ||
      (request.headers.get("accept") || "").includes("application/json");
    const origin = publicBase(request.url);
    if (wantsJson) {
      return json(200, {
        ...post,
        permalink: `${origin}/api/fake-platform/v1/${platform}/posts/${encodeURIComponent(post.id)}`,
      });
    }

    const cleaned = post.imagePath.replace(/^storage\/variants\//, "");
    const imageUrl = cleaned ? `${appHook()}/api/media/${cleaned}` : "";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(post.platform)} · ${escapeHtml(post.id)}</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:Figtree,system-ui,sans-serif; background:#F7F8FC; color:#101828; }
    main { width:min(420px,calc(100vw - 2rem)); background:#fff; border:1px solid #E4E7EC; border-radius:1rem; overflow:hidden; }
    .bar { display:flex; justify-content:space-between; padding:.75rem 1rem; border-bottom:1px solid #E4E7EC; font-size:.75rem; }
    .chip { font-family:ui-monospace,monospace; letter-spacing:.12em; text-transform:uppercase; color:#E11D48; font-weight:600; }
    .ok { color:#15803D; font-weight:600; }
    img { display:block; width:100%; height:auto; }
    .body { padding:1rem; display:grid; gap:.75rem; }
    p { margin:0; white-space:pre-wrap; line-height:1.45; }
  </style>
</head>
<body>
  <main>
    <div class="bar"><span class="chip">${escapeHtml(post.platform)} fake feed</span><span class="ok">published</span></div>
    ${imageUrl ? `<figure style="margin:0;background:#0f172a"><img src="${escapeHtml(imageUrl)}" alt="" /></figure>` : ""}
    <div class="body"><p>${escapeHtml(post.caption)}</p></div>
  </main>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (method === "GET" && (pathname === "/health" || pathname === "/")) {
    return json(200, {
      ok: true,
      force429: store.force429,
      posts: store.posts.length,
      mode: "in-app",
    });
  }

  return json(404, { error: "not found" });
}

/** Default fake platform base for Vercel or when FAKE_PLATFORM_URL is unset. */
export function resolveFakePlatformUrl(origin?: string): string {
  if (useInAppFakePlatform()) {
    const base = (
      origin ||
      process.env.APP_WEBHOOK_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    return `${base}/api/fake-platform`;
  }
  if (process.env.FAKE_PLATFORM_URL) {
    return process.env.FAKE_PLATFORM_URL.replace(/\/$/, "");
  }
  return "http://localhost:4100";
}
