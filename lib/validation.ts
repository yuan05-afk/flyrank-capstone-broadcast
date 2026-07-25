import { z } from "zod";

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  url: z.string().url(),
});

export const scheduleSchema = z.object({
  platform: z.enum(["instagram", "x"]),
  runAt: z.string().datetime(),
});

export const publishSchema = z.object({
  platform: z.enum(["instagram", "x"]).optional(),
});

export const deliverySchema = z.object({
  externalPostId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  status: z.enum(["published", "failed", "queued"]),
  platform: z.string().optional(),
});

export const captionUpdateSchema = z.object({
  caption: z.string().min(1).max(3000),
});

/** Sandbox-only switches surfaced on the campaign desk. */
export const demoActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("force429"), enabled: z.boolean() }),
  z.object({ action: z.literal("replayWebhook"), postId: z.string().min(1) }),
  z.object({ action: z.literal("forgeWebhook"), postId: z.string().min(1) }),
]);
