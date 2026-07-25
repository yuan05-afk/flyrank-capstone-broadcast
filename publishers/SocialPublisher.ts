export type PublishInput = {
  platform: string;
  caption: string;
  imagePath: string;
  idempotencyKey: string;
};

export type PublishResult = {
  externalPostId: string;
  status: "queued" | "published";
};

/**
 * App code depends on this interface only - never on a vendor SDK.
 */
export interface SocialPublisher {
  readonly platform: string;
  publish(input: PublishInput): Promise<PublishResult>;
}
