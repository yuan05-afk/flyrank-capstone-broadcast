import { prisma } from "../lib/db";
import { PLATFORM_KEYS } from "../config/platform-specs";
import { buildAllVariants, variantsDir } from "../lib/images/variants";
import fs from "fs";

async function main() {
  const campaigns = await prisma.campaign.findMany();
  for (const campaign of campaigns) {
    fs.rmSync(variantsDir(campaign.id), { recursive: true, force: true });
    await buildAllVariants(campaign.id, PLATFORM_KEYS, {
      title: campaign.title,
      body: campaign.body,
      url: campaign.url,
    });
    console.log(`regenerated ${campaign.id}`);
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
