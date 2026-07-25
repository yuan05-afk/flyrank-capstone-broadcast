import { createHmac, timingSafeEqual } from "crypto";

export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifySignature(
  secret: string,
  body: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  const expected = signPayload(secret, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
