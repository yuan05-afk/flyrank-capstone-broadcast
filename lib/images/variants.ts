import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { PLATFORM_BRAND } from "@/config/platform-brand";
import { PLATFORM_SPECS, type PlatformKey } from "@/config/platform-specs";
import { SUBJECT_RATIO, computeCrop } from "./geometry";

export type SourcePost = { title: string; body: string; url: string };

/** Logical path stored in DB / served via /api/media (never absolute disk paths). */
export function variantPublicPath(campaignId: string, file: string): string {
  return `storage/variants/${campaignId}/${file}`;
}

/**
 * Physical storage root. On Vercel the project FS is read-only, so variants
 * land under /tmp (or VARIANT_STORAGE_ROOT). Local keeps ./storage/variants.
 */
export function variantsStorageRoot(): string {
  if (process.env.VARIANT_STORAGE_ROOT) {
    return path.resolve(process.env.VARIANT_STORAGE_ROOT);
  }
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "broadcast-variants");
  }
  return path.join(process.cwd(), "storage", "variants");
}

export function variantsDir(campaignId: string): string {
  return path.join(variantsStorageRoot(), campaignId);
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Curated duotones so campaigns look distinct without drifting off brand. */
const BACKDROPS = [
  { from: "#2b0a1f", to: "#4c1130", glow: "#e11d48" },
  { from: "#0b1120", to: "#1e293b", glow: "#fb7185" },
  { from: "#1d0b2e", to: "#3b1053", glow: "#f472b6" },
  { from: "#0a1f2b", to: "#0f3b4d", glow: "#e11d48" },
  { from: "#2a1408", to: "#4a2410", glow: "#fb7185" },
  { from: "#12102b", to: "#241b52", glow: "#e11d48" },
];

function backdropFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return BACKDROPS[hash % BACKDROPS.length];
}

/** Greedy wrap using an average glyph width for the display face. */
function wrap(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const perChar = fontSize * 0.53;
  const budget = Math.max(8, Math.floor(maxWidth / perChar));
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= budget) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines) {
    const consumed = lines.join(" ").length;
    if (consumed < text.replace(/\s+/g, " ").trim().length) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = `${last.slice(0, Math.max(1, budget - 1))}…`;
    }
  }
  return lines;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "broadcast.local";
  }
}

/**
 * Master artwork for a campaign: a wide-gamut backdrop with the subject
 * (title mark) held in the middle so every platform crop keeps it in frame.
 */
export async function ensureSourceImage(
  targetPath: string,
  seed = "broadcast",
  _post?: SourcePost
): Promise<string> {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (fs.existsSync(targetPath)) return targetPath;

  const size = 2000;
  const skin = backdropFor(seed);
  const subject = Math.round(size * SUBJECT_RATIO);
  const offset = Math.round((size - subject) / 2);

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${skin.from}"/>
          <stop offset="100%" stop-color="${skin.to}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="44%" r="46%">
          <stop offset="0%" stop-color="${skin.glow}" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="${skin.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="sweep" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      <circle cx="${size * 0.2}" cy="${size * 0.26}" r="${size * 0.26}" fill="#ffffff" opacity="0.04"/>
      <circle cx="${size * 0.82}" cy="${size * 0.8}" r="${size * 0.3}" fill="#ffffff" opacity="0.035"/>
      <rect width="100%" height="100%" fill="url(#sweep)"/>

      <rect x="${offset}" y="${offset}" width="${subject}" height="${subject}" rx="${subject * 0.1}"
            fill="none" stroke="#FFE4E8" stroke-width="${Math.round(size * 0.006)}" opacity="0.5"/>
      <circle cx="${offset + subject}" cy="${offset}" r="${size * 0.016}" fill="#E11D48"/>
      <line x1="${size / 2}" y1="${offset - size * 0.05}" x2="${size / 2}" y2="${offset + size * 0.02}"
            stroke="#FFE4E8" stroke-width="${Math.round(size * 0.003)}" opacity="0.35"/>
      <line x1="${size / 2}" y1="${offset + subject - size * 0.02}" x2="${size / 2}" y2="${offset + subject + size * 0.05}"
            stroke="#FFE4E8" stroke-width="${Math.round(size * 0.003)}" opacity="0.35"/>
    </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(targetPath);
  return targetPath;
}

/** Caption card burned onto the crop so each artifact names its own platform. */
function overlaySvg(
  platform: PlatformKey,
  post: SourcePost,
  width: number,
  height: number
): Buffer {
  const spec = PLATFORM_SPECS[platform];
  const brand = PLATFORM_BRAND[platform];
  const pad = Math.round(width * 0.06);
  const titleSize = Math.round(width * (platform === "instagram" ? 0.068 : 0.05));
  const maxLines = platform === "instagram" ? 3 : 2;
  const lines = wrap(post.title, titleSize, width - pad * 2, maxLines);
  const lineGap = Math.round(titleSize * 1.18);
  const metaSize = Math.round(titleSize * 0.34);
  const blockHeight = lines.length * lineGap + metaSize * 3.4;
  const baseY = height - pad - metaSize * 1.6;
  const titleTop = baseY - lines.length * lineGap;

  const chipW = Math.round(metaSize * (spec.label.length + spec.aspect.length + 8) * 0.72);
  const chipH = Math.round(metaSize * 2.1);
  const iconSize = chipH * 0.42;
  const iconX = pad + chipH * 0.28;
  const iconY = pad + (chipH - iconSize) / 2;

  const titleTspans = lines
    .map(
      (line, i) =>
        `<tspan x="${pad}" y="${titleTop + (i + 1) * lineGap}">${esc(line)}</tspan>`
    )
    .join("");

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0b1120" stop-opacity="0"/>
          <stop offset="100%" stop-color="#0b1120" stop-opacity="0.88"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${Math.max(0, height - blockHeight - pad * 2)}" width="${width}"
            height="${Math.min(height, blockHeight + pad * 2)}" fill="url(#scrim)"/>

      <rect x="${pad}" y="${pad}" width="${chipW}" height="${chipH}" rx="${chipH / 2}"
            fill="#0b1120" opacity="0.62"/>
      <circle cx="${iconX + iconSize / 2}" cy="${iconY + iconSize / 2}" r="${iconSize * 0.76}"
              fill="#ffffff"/>
      <g transform="translate(${iconX} ${iconY}) scale(${iconSize / 24})" fill="${brand.color}">
        <path d="${brand.path}"/>
      </g>
      <text x="${pad + chipH * 0.96}" y="${pad + chipH * 0.68}"
            font-family="IBM Plex Mono, Consolas, monospace" font-size="${metaSize}"
            fill="#FFE4E8" letter-spacing="${metaSize * 0.08}">${esc(
              `${spec.label.toUpperCase()} · ${spec.aspect}`
            )}</text>

      <rect x="${width - pad - chipH}" y="${pad}" width="${chipH}" height="${chipH}" rx="${chipH * 0.3}"
            fill="#E11D48"/>
      <circle cx="${width - pad - chipH * 0.5}" cy="${pad + chipH * 0.5}" r="${chipH * 0.16}" fill="#FFE4E8"/>

      <text font-family="Sora, Segoe UI, Helvetica, sans-serif" font-size="${titleSize}"
            font-weight="700" fill="#ffffff">${titleTspans}</text>

      <text x="${pad}" y="${baseY + metaSize * 1.5}"
            font-family="IBM Plex Mono, Consolas, monospace" font-size="${metaSize}"
            fill="#FFE4E8" opacity="0.86" letter-spacing="${metaSize * 0.06}">${esc(
              domainOf(post.url)
            )}</text>
    </svg>`);
}

export {
  SUBJECT_RATIO,
  computeCrop,
  subjectRect,
  type CropRect,
} from "./geometry";

/**
 * Center-crop with the platform safe-zone inset, resize to spec dimensions,
 * then burn the platform caption card on top.
 */
export async function buildVariant(
  sourcePath: string,
  platform: PlatformKey,
  outPath: string,
  post?: SourcePost
): Promise<{ width: number; height: number; path: string }> {
  const spec = PLATFORM_SPECS[platform];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const meta = await sharp(sourcePath).metadata();
  const sw = meta.width ?? 2000;
  const sh = meta.height ?? 2000;
  const crop = computeCrop(sw, sh, platform);

  const cropped = await sharp(sourcePath)
    .extract(crop)
    .resize(spec.width, spec.height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const content: SourcePost = post || {
    title: "Broadcast campaign",
    body: "",
    url: "https://broadcast.local",
  };

  await sharp(cropped)
    .composite([{ input: overlaySvg(platform, content, spec.width, spec.height), top: 0, left: 0 }])
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
  platforms: PlatformKey[],
  post?: SourcePost
): Promise<Record<PlatformKey, string>> {
  const dir = variantsDir(campaignId);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, "source.png");
  await ensureSourceImage(source, campaignId, post);

  const result = {} as Record<PlatformKey, string>;
  for (const p of platforms) {
    const out = path.join(dir, `${p}.png`);
    await buildVariant(source, p, out, post);
    result[p] = out;
  }
  return result;
}
