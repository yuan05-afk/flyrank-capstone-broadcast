import { NextRequest } from "next/server";
import { requireDemoAuth } from "@/lib/auth";
import { campaignService } from "@/services/campaign.service";

type Ctx = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Ctx) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;
  const campaign = await campaignService.get(params.id);
  if (!campaign) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ campaign });
}
