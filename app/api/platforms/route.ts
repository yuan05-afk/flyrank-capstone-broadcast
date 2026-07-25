import { PLATFORM_SPECS } from "@/config/platform-specs";
import { resolveFakePlatformUrl } from "@/fake-platform/runtime";

export async function GET() {
  return Response.json({
    platforms: Object.values(PLATFORM_SPECS),
    fakePlatformUrl: resolveFakePlatformUrl(),
  });
}
