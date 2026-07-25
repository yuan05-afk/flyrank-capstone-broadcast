import fs from "fs";
import path from "path";

type Ctx = { params: { path: string[] } };

export async function GET(_req: Request, { params }: Ctx) {
  const rel = params.path.join("/");
  if (rel.includes("..")) {
    return new Response("Bad path", { status: 400 });
  }
  const file = path.join(process.cwd(), "storage", "variants", rel);
  if (!fs.existsSync(file)) {
    return new Response("Not found", { status: 404 });
  }
  const buf = fs.readFileSync(file);
  return new Response(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=60",
    },
  });
}
