export type PlatformKey = "instagram" | "x";

export type PlatformSpec = {
  key: PlatformKey;
  label: string;
  width: number;
  height: number;
  aspect: string;
  /** Inset ratio kept around the subject when center-cropping (0-0.5). */
  safeZoneInset: number;
  voiceId: string;
  charBudget?: number;
};

export const PLATFORM_SPECS: Record<PlatformKey, PlatformSpec> = {
  instagram: {
    key: "instagram",
    label: "Instagram",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    safeZoneInset: 0.08,
    voiceId: "visual-short",
  },
  x: {
    key: "x",
    label: "X",
    width: 1600,
    height: 900,
    aspect: "16:9",
    safeZoneInset: 0.1,
    voiceId: "punchy-link",
    charBudget: 260,
  },
};

export const PLATFORM_KEYS = Object.keys(PLATFORM_SPECS) as PlatformKey[];
