import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function keyBuf(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes as 64 hex chars");
  }
  return Buffer.from(hex, "hex");
}

/** AES-256-GCM with a fresh random IV per write. */
export function encryptToken(plaintext: string): { ciphertext: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuf(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return { ciphertext: enc.toString("base64"), iv: iv.toString("base64") };
}

export function decryptToken(ciphertext: string, iv: string): string {
  try {
    const raw = Buffer.from(ciphertext, "base64");
    const data = raw.subarray(0, raw.length - 16);
    const tag = raw.subarray(raw.length - 16);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyBuf(),
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    throw new Error(
      "platform credential decrypt failed (TOKEN_ENCRYPTION_KEY mismatch)"
    );
  }
}
