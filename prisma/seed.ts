import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { encryptToken } from "../lib/crypto/token";

const prisma = new PrismaClient();

async function main() {
  await prisma.job.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.platformCredential.deleteMany();

  const base = process.env.FAKE_PLATFORM_URL || "http://localhost:4100";
  for (const platform of ["instagram", "x"]) {
    let token = `seed_${platform}_token`;
    try {
      const res = await fetch(`${base}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (res.ok) {
        const data = (await res.json()) as { access_token: string };
        token = data.access_token;
      }
    } catch {
      /* fake platform may be down during seed */
    }
    const enc = encryptToken(token);
    await prisma.platformCredential.create({
      data: {
        platform,
        encryptedToken: enc.ciphertext,
        iv: enc.iv,
      },
    });
  }

  const fixture = {
    title: "Why safe-zone crops matter for social campaigns",
    body: "A single master image rarely survives every platform. Broadcast keeps the subject inside each crop so Instagram squares and X wides still feel intentional.",
    url: "https://example.com/blog/safe-zone-crops",
  };
  const fixturePath = path.join(process.cwd(), "fixtures", "sample-post.json");
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

  console.log("Seeded credentials for instagram + x");
  console.log("Demo API key:", process.env.DEMO_API_KEY || "broadcast_demo_key_001");
  console.log("Sample post written to fixtures/sample-post.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
