import { NextRequest } from "next/server";

export function requireDemoAuth(request: NextRequest): Response | null {
  const key = process.env.DEMO_API_KEY || "broadcast_demo_key_001";
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookie = request.cookies.get("broadcast_session")?.value;
  if (bearer === key || cookie === key) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
