import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const c = await prisma.campaign.findFirst({ orderBy: { createdAt: "desc" } });
  console.log(c?.id || "");
  await prisma.$disconnect();
}

main();
