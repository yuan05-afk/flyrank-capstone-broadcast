import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import {
  ensureCampaignVariants,
  variantsStorageRoot,
} from "@/lib/images/variants";

type Ctx = { params: { path: string[] } };

export async function GET(_req: Request, { params }: Ctx) {
  const rel = params.path.join("/");
  if (rel.includes("..") || !rel) {
    return new Response("Bad path", { status: 400 });
  }

  const file = path.join(variantsStorageRoot(), rel);

  // On Vercel, /tmp is per-instance. If this instance never rendered the
  // campaign, rebuild from Neon metadata so <img> stops showing broken icons.
  if (!fs.existsSync(file)) {
    const [campaignId] = params.path;
    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, title: true, body: true, url: true },
      });
      if (campaign) {
        await ensureCampaignVariants(campaign.id, {
          title: campaign.title,
          body: campaign.body,
          url: campaign.url,
        });
      }
    }
  }

  if (!fs.existsSync(file)) {
    return new Response("Not found", { status: 404 });
  }

  const buf = fs.readFileSync(file);
  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      // Short cache: regen can refresh after cold instance handoff.
      "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
    },
  });
}
