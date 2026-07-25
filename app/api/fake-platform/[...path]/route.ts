import { handleFakePlatform } from "@/fake-platform/runtime";

type Ctx = { params: { path?: string[] } };

async function dispatch(request: Request, ctx: Ctx) {
  const segments = ctx.params.path ?? [];
  return handleFakePlatform(request, segments);
}

export async function GET(request: Request, ctx: Ctx) {
  return dispatch(request, ctx);
}

export async function POST(request: Request, ctx: Ctx) {
  return dispatch(request, ctx);
}
