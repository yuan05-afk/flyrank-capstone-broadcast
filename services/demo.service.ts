import { signPayload } from "@/lib/webhooks/signature";
import { socialPostsRepository } from "@/repositories";

/**
 * Sandbox levers behind the campaign desk's "Prove it" controls. Every action
 * runs the real code path (real 429 from the platform, real signature check on
 * our own webhook route) rather than faking a result in the UI.
 */

function fakeBase() {
  return (process.env.FAKE_PLATFORM_URL || "http://localhost:4100").replace(
    /\/$/,
    ""
  );
}

function appBase(origin?: string) {
  const base =
    origin || process.env.APP_WEBHOOK_BASE_URL || "http://localhost:3000";
  return base.replace(/\/$/, "");
}

async function requirePost(postId: string) {
  const post = await socialPostsRepository.findById(postId);
  if (!post) throw new Error("post not found");
  return post;
}

export const demoService = {
  async state() {
    try {
      const res = await fetch(`${fakeBase()}/health`, { cache: "no-store" });
      if (!res.ok) throw new Error(`health ${res.status}`);
      const data = (await res.json()) as { force429?: boolean; posts?: number };
      return {
        reachable: true,
        force429: Boolean(data.force429),
        remotePosts: data.posts ?? 0,
      };
    } catch {
      return { reachable: false, force429: false, remotePosts: 0 };
    }
  },

  /** Flip the platform into rate-limited mode so backoff is observable. */
  async setForce429(enabled: boolean) {
    const res = await fetch(`${fakeBase()}/admin/force-429`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error("fake platform is not reachable");
    const data = (await res.json()) as { force429: boolean };
    return { force429: data.force429 };
  },

  /** Ask the platform to re-send a signed delivery for an already accepted post. */
  async replayWebhook(postId: string) {
    const post = await requirePost(postId);
    if (!post.externalPostId) {
      throw new Error("publish this platform first, then replay its webhook");
    }
    const res = await fetch(`${fakeBase()}/admin/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalPostId: post.externalPostId }),
    });
    if (!res.ok) throw new Error("platform could not replay that delivery");
    return { platform: post.platform, externalPostId: post.externalPostId };
  },

  /**
   * Post a well-formed delivery signed with the wrong secret. The webhook route
   * should reject it with 400 and leave the post's status untouched.
   */
  async forgeWebhook(postId: string, origin?: string) {
    const post = await requirePost(postId);
    const body = JSON.stringify({
      externalPostId: post.externalPostId ?? "fp_forged_by_demo",
      idempotencyKey: post.idempotencyKey,
      platform: post.platform,
      status: "published",
    });
    const res = await fetch(`${appBase(origin)}/api/webhooks/social-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Broadcast-Signature": signPayload("attacker_guessed_secret", body),
      },
      body,
    });
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      platform: post.platform,
      status: res.status,
      rejected: res.status === 400,
      error: detail.error ?? null,
    };
  },
};
