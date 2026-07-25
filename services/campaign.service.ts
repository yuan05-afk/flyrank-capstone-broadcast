import fs from "fs";
import path from "path";
import { composeCaption } from "@/config/social-prompts.config";
import { PLATFORM_KEYS, type PlatformKey } from "@/config/platform-specs";
import { buildAllVariants, variantsDir } from "@/lib/images/variants";
import { encryptToken, decryptToken } from "@/lib/crypto/token";
import {
  campaignsRepository,
  credentialsRepository,
  jobsRepository,
  socialPostsRepository,
} from "@/repositories";
import {
  createInstagramPublisher,
  createXPublisher,
} from "@/publishers/registry";
import type { SocialPublisher } from "@/publishers/SocialPublisher";

function idemKey(campaignId: string, platform: string) {
  return `camp_${campaignId}_${platform}`;
}

async function ensureCredential(platform: string): Promise<string> {
  const existing = await credentialsRepository.find(platform);
  if (existing) return decryptToken(existing.encryptedToken, existing.iv);

  const base = process.env.FAKE_PLATFORM_URL || "http://localhost:4100";
  const res = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  });
  if (!res.ok) throw new Error(`oauth failed for ${platform}`);
  const data = (await res.json()) as { access_token: string };
  const enc = encryptToken(data.access_token);
  await credentialsRepository.upsertEncrypted(
    platform,
    enc.ciphertext,
    enc.iv
  );
  return data.access_token;
}

function publisherFor(platform: PlatformKey): SocialPublisher {
  const getToken = () => ensureCredential(platform);
  if (platform === "instagram") return createInstagramPublisher(getToken);
  return createXPublisher(getToken);
}

export const campaignService = {
  async createFromPost(input: {
    title: string;
    body: string;
    url: string;
  }) {
    const campaign = await campaignsRepository.create(input);
    const variants = await buildAllVariants(campaign.id, PLATFORM_KEYS, input);

    const rows = PLATFORM_KEYS.map((platform) => {
      const caption = composeCaption(platform, input);
      const abs = variants[platform];
      const rel = path.relative(process.cwd(), abs).replace(/\\/g, "/");
      return {
        campaignId: campaign.id,
        platform,
        caption,
        imagePath: rel,
        idempotencyKey: idemKey(campaign.id, platform),
        status: "draft",
      };
    });
    await socialPostsRepository.createMany(rows);
    return campaignsRepository.findById(campaign.id);
  },

  async list() {
    return campaignsRepository.list();
  },

  async get(id: string) {
    return campaignsRepository.findById(id);
  },

  /**
   * Edit the copy for one platform. The idempotency key is deliberately left
   * alone: republishing an edited post is a replay, not a second remote post.
   */
  async updateCaption(campaignId: string, postId: string, caption: string) {
    const post = await socialPostsRepository.findById(postId);
    if (!post || post.campaignId !== campaignId) {
      throw new Error("post not found");
    }
    await socialPostsRepository.update(postId, { caption });
    return campaignsRepository.findById(campaignId);
  },

  /** Remove a campaign plus its posts, jobs, and rendered variants. */
  async remove(id: string) {
    const campaign = await campaignsRepository.findById(id);
    if (!campaign) return null;
    await campaignsRepository.remove(id);
    fs.rmSync(variantsDir(id), { recursive: true, force: true });
    return campaign;
  },

  async publishNow(campaignId: string, platform?: string) {
    const campaign = await campaignsRepository.findById(campaignId);
    if (!campaign) throw new Error("campaign not found");
    const targets = campaign.posts.filter((p) =>
      platform ? p.platform === platform : true
    );

    const results = [];
    for (const post of targets) {
      const pub = publisherFor(post.platform as PlatformKey);
      await socialPostsRepository.update(post.id, { status: "queued" });
      try {
        const result = await pub.publish({
          platform: post.platform,
          caption: post.caption,
          imagePath: post.imagePath,
          idempotencyKey: post.idempotencyKey,
        });
        await socialPostsRepository.update(post.id, {
          externalPostId: result.externalPostId,
          status: "queued",
          lastError: null,
        });
        results.push({ platform: post.platform, ...result });
      } catch (err) {
        const message = (err as Error).message;
        await socialPostsRepository.update(post.id, {
          status: "failed",
          lastError: message,
        });
        results.push({ platform: post.platform, error: message });
      }
    }
    return { results, campaign: await campaignsRepository.findById(campaignId) };
  },

  async schedule(
    campaignId: string,
    platform: string,
    runAt: Date
  ) {
    const posts = await socialPostsRepository.findByCampaign(campaignId);
    const post = posts.find((p) => p.platform === platform);
    if (!post) throw new Error("platform post not found");
    await socialPostsRepository.update(post.id, {
      scheduledFor: runAt,
      status: "queued",
    });
    const job = await jobsRepository.enqueue({
      campaignId,
      socialPostId: post.id,
      type: "publish",
      runAt,
    });
    return { job, post: await socialPostsRepository.findById(post.id) };
  },

  async applyDelivery(payload: {
    externalPostId: string;
    idempotencyKey: string;
    status: string;
  }) {
    const post = await socialPostsRepository.findByIdempotencyKey(
      payload.idempotencyKey
    );
    if (!post) return null;
    if (payload.status === "published") {
      return socialPostsRepository.update(post.id, {
        status: "published",
        externalPostId: payload.externalPostId,
        publishedAt: new Date(),
        lastError: null,
      });
    }
    if (payload.status === "failed") {
      return socialPostsRepository.update(post.id, {
        status: "failed",
        lastError: "delivery reported failed",
      });
    }
    return post;
  },
};

export const workerService = {
  async tickOnce() {
    const job = await jobsRepository.claimDue();
    if (!job) return { processed: false };

    const post = await socialPostsRepository.findById(job.socialPostId);
    if (!post) {
      await jobsRepository.markDone(job.id);
      return { processed: true, skipped: true };
    }

    try {
      const pub = publisherFor(post.platform as PlatformKey);
      const result = await pub.publish({
        platform: post.platform,
        caption: post.caption,
        imagePath: post.imagePath,
        idempotencyKey: post.idempotencyKey,
      });
      await socialPostsRepository.update(post.id, {
        externalPostId: result.externalPostId,
        status: "queued",
        lastError: null,
      });
      await jobsRepository.markDone(job.id);
      return { processed: true, jobId: job.id, externalPostId: result.externalPostId };
    } catch (err) {
      const message = (err as Error).message;
      await socialPostsRepository.update(post.id, {
        status: "failed",
        lastError: message,
      });
      await jobsRepository.markError(job.id, message);
      return { processed: true, error: message };
    }
  },
};
