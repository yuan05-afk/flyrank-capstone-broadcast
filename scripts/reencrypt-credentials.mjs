import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

function keyBuf() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes as 64 hex chars");
  }
  return Buffer.from(hex, "hex");
}

function encryptToken(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuf(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return { ciphertext: enc.toString("base64"), iv: iv.toString("base64") };
}

function decryptToken(ciphertext, iv) {
  const raw = Buffer.from(ciphertext, "base64");
  const data = raw.subarray(0, raw.length - 16);
  const tag = raw.subarray(raw.length - 16);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBuf(),
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

const prisma = new PrismaClient();
const platforms = ["instagram", "x"];

for (const platform of platforms) {
  const token = `seed_${platform}_token`;
  const enc = encryptToken(token);
  await prisma.platformCredential.upsert({
    where: { platform },
    create: { platform, encryptedToken: enc.ciphertext, iv: enc.iv },
    update: { encryptedToken: enc.ciphertext, iv: enc.iv },
  });
  const row = await prisma.platformCredential.findUnique({ where: { platform } });
  const roundtrip = decryptToken(row.encryptedToken, row.iv);
  console.log(platform, roundtrip === token ? "ok" : "FAIL");
}

await prisma.$disconnect();
