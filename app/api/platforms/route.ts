import { PLATFORM_SPECS } from "@/config/platform-specs";

export async function GET() {
  return Response.json({ platforms: Object.values(PLATFORM_SPECS) });
}
