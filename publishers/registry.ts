import type { SocialPublisher } from "./SocialPublisher";
import { FakeHttpPublisher } from "./FakeHttpPublisher";

/** Instagram adapter - talks only to the local fake platform. */
export class InstagramAdapter extends FakeHttpPublisher {
  constructor(getToken: () => Promise<string>) {
    super({ platform: "instagram", getToken });
  }
}

/** X adapter - talks only to the local fake platform. */
export class XAdapter extends FakeHttpPublisher {
  constructor(getToken: () => Promise<string>) {
    super({ platform: "x", getToken });
  }
}

export function createInstagramPublisher(
  getToken: () => Promise<string>
): SocialPublisher {
  return new InstagramAdapter(getToken);
}

export function createXPublisher(
  getToken: () => Promise<string>
): SocialPublisher {
  return new XAdapter(getToken);
}
