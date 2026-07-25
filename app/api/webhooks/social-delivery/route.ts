import { NextRequest } from "next/server";
import { deliverySchema } from "@/lib/validation";
import { verifySignature } from "@/lib/webhooks/signature";
import { campaignService } from "@/services/campaign.service";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const secret =
    process.env.FAKE_PLATFORM_WEBHOOK_SECRET || "broadcast_webhook_secret_dev";
  const sig = request.headers.get("x-broadcast-signature");
  if (!verifySignature(secret, raw, sig)) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deliverySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const updated = await campaignService.applyDelivery(parsed.data);
  if (!updated) {
    return Response.json({ error: "Unknown post" }, { status: 404 });
  }
  return Response.json({ ok: true, post: updated });
}
