import { NextRequest } from "next/server";
import { requireDemoAuth } from "@/lib/auth";
import { createCampaignSchema } from "@/lib/validation";
import { campaignService } from "@/services/campaign.service";

export async function GET(request: NextRequest) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;
  const campaigns = await campaignService.list();
  return Response.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;
  const json = await request.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const campaign = await campaignService.createFromPost(parsed.data);
  return Response.json({ campaign }, { status: 201 });
}
