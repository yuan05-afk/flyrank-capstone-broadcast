import { NextRequest } from "next/server";
import { requireDemoAuth } from "@/lib/auth";
import { publishSchema } from "@/lib/validation";
import { campaignService } from "@/services/campaign.service";

type Ctx = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Ctx) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;
  const json = await request.json().catch(() => ({}));
  const parsed = publishSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const result = await campaignService.publishNow(
      params.id,
      parsed.data.platform
    );
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 });
  }
}
