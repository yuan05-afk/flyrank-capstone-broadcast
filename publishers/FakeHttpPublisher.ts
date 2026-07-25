import type {
  PublishInput,
  PublishResult,
  SocialPublisher,
} from "./SocialPublisher";
import {
  fakePlatformFetch,
  resolveFakePlatformUrl,
} from "@/fake-platform/runtime";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type FakeHttpPublisherOptions = {
  platform: string;
  getToken: () => Promise<string>;
  baseUrl?: string;
  maxRetries?: number;
};

/**
 * Shared HTTP client for fake-platform adapters.
 * Handles Idempotency-Key and 429 Retry-After backoff.
 * On Vercel, routes through in-process fakePlatformFetch (no self-HTTP).
 */
export class FakeHttpPublisher implements SocialPublisher {
  readonly platform: string;
  private getToken: () => Promise<string>;
  private baseUrl: string;
  private maxRetries: number;
  private useRelative: boolean;

  constructor(opts: FakeHttpPublisherOptions) {
    this.platform = opts.platform;
    this.getToken = opts.getToken;
    this.baseUrl = opts.baseUrl || resolveFakePlatformUrl();
    this.maxRetries = opts.maxRetries ?? 4;
    // Explicit baseUrl (tests) still uses absolute fetch.
    this.useRelative = !opts.baseUrl;
  }

  private async post(path: string, init: RequestInit): Promise<Response> {
    if (this.useRelative) {
      return fakePlatformFetch(path, init);
    }
    return fetch(`${this.baseUrl}${path}`, init);
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      const token = await this.getToken();
      const res = await this.post(`/v1/${this.platform}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          caption: input.caption,
          imagePath: input.imagePath,
        }),
      });

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") || "1");
        const waitMs = Math.max(1, retryAfter) * 1000;
        await sleep(waitMs);
        attempt += 1;
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`publish failed ${res.status}: ${text}`);
      }

      const data = (await res.json()) as {
        id: string;
        status: "queued" | "published";
      };
      return { externalPostId: data.id, status: data.status || "queued" };
    }
    throw new Error("exhausted retries after repeated 429");
  }
}
