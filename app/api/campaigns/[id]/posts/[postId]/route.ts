import { NextRequest } from "next/server";
import { requireDemoAuth } from "@/lib/auth";
import { captionUpdateSchema } from "@/lib/validation";
import { campaignService } from "@/services/campaign.service";

type Ctx = { params: { id: string; postId: string } };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;

  const json = await request.json().catch(() => ({}));
  const parsed = captionUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const campaign = await campaignService.updateCaption(
      params.id,
      params.postId,
      parsed.data.caption
    );
    return Response.json({ campaign });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 });
  }
}
