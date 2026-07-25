import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireDemoAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const key = process.env.DEMO_API_KEY || "broadcast_demo_key_001";
  if (body.apiKey !== key) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }
  cookies().set("broadcast_session", key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  cookies().delete("broadcast_session");
  return Response.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const denied = requireDemoAuth(request);
  if (denied) return denied;
  return Response.json({ ok: true });
}
