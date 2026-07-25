import { NextRequest } from "next/server";
import { requireDemoAuth } from "@/lib/auth";
import { demoActionSchema } from "@/lib/validation";
import { demoService } from "@/services/demo.service";

export async function GET(request: NextRequest) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;
  return Response.json(await demoService.state());
}

export async function POST(request: NextRequest) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;

  const json = await request.json().catch(() => ({}));
  const parsed = demoActionSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const input = parsed.data;
    if (input.action === "force429") {
      return Response.json(await demoService.setForce429(input.enabled));
    }
    if (input.action === "replayWebhook") {
      return Response.json(await demoService.replayWebhook(input.postId));
    }
    return Response.json(
      await demoService.forgeWebhook(input.postId, request.nextUrl.origin)
    );
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
