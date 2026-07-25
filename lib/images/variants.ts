import fs from "fs";
import path from "path";
import sharp from "sharp";
import { PLATFORM_SPECS, type PlatformKey } from "@/config/platform-specs";

const ROOT = process.cwd();

export function variantsDir(campaignId: string): string {
  return path.join(ROOT, "storage", "variants", campaignId);
}

/** Create a simple source PNG with a centered subject block (for safe-zone crops). */
export async function ensureSourceImage(targetPath: string): Promise<string> {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (fs.existsSync(targetPath)) return targetPath;

  const size = 1600;
  const subject = 640;
  const offset = (size - subject) / 2;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1f2937"/>
          <stop offset="100%" stop-color="#111827"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect x="${offset}" y="${offset}" width="${subject}" height="${subject}" rx="48" fill="#E11D48"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="90" fill="#FFE4E8"/>
    </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(targetPath);
  return targetPath;
}

/**
 * Center-crop with safe-zone inset then resize to platform dimensions.
 * Subject stays inside the kept region by construction (centered block source).
 */
export async function buildVariant(
  sourcePath: string,
  platform: PlatformKey,
  outPath: string
): Promise<{ width: number; height: number; path: string }> {
  const spec = PLATFORM_SPECS[platform];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const meta = await sharp(sourcePath).metadata();
  const sw = meta.width ?? 1600;
  const sh = meta.height ?? 1600;
  const targetRatio = spec.width / spec.height;

  let cropW = sw;
  let cropH = sh;
  if (sw / sh > targetRatio) {
    cropW = Math.round(sh * targetRatio);
    cropH = sh;
  } else {
    cropW = sw;
    cropH = Math.round(sw / targetRatio);
  }

  const inset = spec.safeZoneInset;
  cropW = Math.round(cropW * (1 - inset * 2));
  cropH = Math.round(cropH * (1 - inset * 2));
  const left = Math.max(0, Math.round((sw - cropW) / 2));
  const top = Math.max(0, Math.round((sh - cropH) / 2));

  await sharp(sourcePath)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(spec.width, spec.height, { fit: "fill" })
    .png()
    .toFile(outPath);

  const outMeta = await sharp(outPath).metadata();
  return {
    width: outMeta.width ?? spec.width,
    height: outMeta.height ?? spec.height,
    path: outPath,
  };
}

export async function buildAllVariants(
  campaignId: string,
  platforms: PlatformKey[]
): Promise<Record<PlatformKey, string>> {
  const dir = variantsDir(campaignId);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, "source.png");
  await ensureSourceImage(source);

  const result = {} as Record<PlatformKey, string>;
  for (const p of platforms) {
    const out = path.join(dir, `${p}.png`);
    await buildVariant(source, p, out);
    result[p] = out;
  }
  return result;
}
