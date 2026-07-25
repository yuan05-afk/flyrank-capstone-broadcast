import { NextRequest } from "next/server";
import { requireDemoAuth } from "@/lib/auth";
import { workerService } from "@/services/campaign.service";

/** Manual tick for demos / tests without a long-running process. */
export async function POST(request: NextRequest) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;
  const result = await workerService.tickOnce();
  return Response.json(result);
}
