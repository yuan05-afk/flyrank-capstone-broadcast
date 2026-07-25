import type { PlatformKey } from "./platform-specs";

/** Fragment-based caption composition - shared + platform-specific. */

const SHARED = {
  opener: (title: string) => `Fresh from the desk: ${title}`,
  closerCta: "Read the full piece",
  brand: "Broadcast",
};

const PLATFORM_FRAGMENTS: Record<
  PlatformKey,
  {
    tone: string;
    structure: (parts: {
      title: string;
      body: string;
      url: string;
    }) => string;
  }
> = {
  instagram: {
    tone: "visual-first, short, emoji-light",
    structure: ({ title, body, url }) => {
      const hook = body.split(/[.!?]/)[0]?.trim() || body.slice(0, 90);
      return [
        SHARED.opener(title),
        "",
        hook,
        "",
        `${SHARED.closerCta} - link in bio context: ${url}`,
        "",
        `#${SHARED.brand.toLowerCase()} #fieldnotes`,
      ].join("\n");
    },
  },
  x: {
    tone: "punchy, link-aware, character-budgeted",
    structure: ({ title, body, url }) => {
      const bite = body.replace(/\s+/g, " ").trim().slice(0, 120);
      const base = `${title}: ${bite}`;
      const withLink = `${base} ${url}`;
      if (withLink.length <= 260) return withLink;
      return `${title.slice(0, 80)} - ${url}`;
    },
  },
};

export function composeCaption(
  platform: PlatformKey,
  post: { title: string; body: string; url: string }
): string {
  return PLATFORM_FRAGMENTS[platform].structure(post);
}

export function captionPromptPreview(platform: PlatformKey): string {
  const frag = PLATFORM_FRAGMENTS[platform];
  return `tone=${frag.tone}; uses shared opener/CTA fragments + platform structure`;
}
