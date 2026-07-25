import { handleFakePlatform } from "@/fake-platform/runtime";

export async function GET(request: Request) {
  return handleFakePlatform(request, ["health"]);
}
