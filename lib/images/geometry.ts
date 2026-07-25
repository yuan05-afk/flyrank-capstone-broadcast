import { PLATFORM_SPECS, type PlatformKey } from "@/config/platform-specs";

/**
 * Pure crop math, kept free of sharp and fs so the campaign desk can draw the
 * exact rectangles the render pipeline will cut.
 */

/** Side of the centered subject block, as a ratio of the master image. */
export const SUBJECT_RATIO = 0.36;

export type CropRect = { left: number; top: number; width: number; height: number };

/** Center crop matching the platform aspect, pulled in by its safe-zone inset. */
export function computeCrop(
  sourceWidth: number,
  sourceHeight: number,
  platform: PlatformKey
): CropRect {
  const spec = PLATFORM_SPECS[platform];
  const targetRatio = spec.width / spec.height;

  let cropW: number;
  let cropH: number;
  if (sourceWidth / sourceHeight > targetRatio) {
    cropW = Math.round(sourceHeight * targetRatio);
    cropH = sourceHeight;
  } else {
    cropW = sourceWidth;
    cropH = Math.round(sourceWidth / targetRatio);
  }

  const inset = spec.safeZoneInset;
  cropW = Math.round(cropW * (1 - inset * 2));
  cropH = Math.round(cropH * (1 - inset * 2));

  return {
    left: Math.max(0, Math.round((sourceWidth - cropW) / 2)),
    top: Math.max(0, Math.round((sourceHeight - cropH) / 2)),
    width: cropW,
    height: cropH,
  };
}

/** The subject box a crop must fully contain for the composition to survive. */
export function subjectRect(sourceWidth: number, sourceHeight: number): CropRect {
  const side = Math.round(Math.min(sourceWidth, sourceHeight) * SUBJECT_RATIO);
  return {
    left: Math.round((sourceWidth - side) / 2),
    top: Math.round((sourceHeight - side) / 2),
    width: side,
    height: side,
  };
}

/** Same rectangles expressed as 0-1 fractions, for CSS overlays. */
export function cropFractions(platform: PlatformKey) {
  const size = 1000;
  const crop = computeCrop(size, size, platform);
  return {
    left: crop.left / size,
    top: crop.top / size,
    width: crop.width / size,
    height: crop.height / size,
  };
}
