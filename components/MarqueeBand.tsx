"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Full-bleed horizontal marquee that fills the space under the hero.
 * Two rows drift in opposite directions; pauses on hover; respects
 * prefers-reduced-motion. Content is the Broadcast vocabulary so the band
 * reads as product, not decoration.
 */

type Token =
  | { kind: "aspect"; label: string }
  | { kind: "platform"; label: string }
  | { kind: "status"; label: string; tone: "queued" | "published" | "failed" }
  | { kind: "word"; label: string };

const ROW_A: Token[] = [
  { kind: "platform", label: "Instagram" },
  { kind: "aspect", label: "1:1" },
  { kind: "word", label: "Safe-zone crop" },
  { kind: "status", label: "queued", tone: "queued" },
  { kind: "platform", label: "X" },
  { kind: "aspect", label: "16:9" },
  { kind: "word", label: "Fragment captions" },
  { kind: "status", label: "published", tone: "published" },
  { kind: "word", label: "Idempotent publish" },
  { kind: "aspect", label: "4:5" },
];

const ROW_B: Token[] = [
  { kind: "word", label: "429 aware" },
  { kind: "status", label: "published", tone: "published" },
  { kind: "word", label: "Signed webhook" },
  { kind: "platform", label: "Instagram" },
  { kind: "word", label: "Encrypted tokens" },
  { kind: "aspect", label: "16:9" },
  { kind: "word", label: "Durable worker" },
  { kind: "status", label: "queued", tone: "queued" },
  { kind: "platform", label: "X" },
  { kind: "word", label: "One source, every frame" },
];

function Chip({ token }: { token: Token }) {
  if (token.kind === "aspect") {
    return (
      <span className="bc-marquee-chip bc-marquee-chip--aspect">
        <span className="bc-marquee-ratio" aria-hidden="true" data-ratio={token.label} />
        {token.label}
      </span>
    );
  }
  if (token.kind === "platform") {
    return (
      <span className="bc-marquee-chip bc-marquee-chip--platform">
        <span className="bc-marquee-frame" aria-hidden="true" />
        {token.label}
      </span>
    );
  }
  if (token.kind === "status") {
    return (
      <span className={`bc-marquee-chip bc-marquee-status bc-marquee-status--${token.tone}`}>
        <span className="bc-marquee-dot" aria-hidden="true" />
        {token.label}
      </span>
    );
  }
  return <span className="bc-marquee-word">{token.label}</span>;
}

function Track({ tokens, dir }: { tokens: Token[]; dir: "left" | "right" }) {
  return (
    <div className={`bc-marquee-track bc-marquee-track--${dir}`}>
      {[0, 1].map((copy) => (
        <div className="bc-marquee-group" key={copy} aria-hidden={copy === 1}>
          {tokens.map((token, i) => (
            <div className="bc-marquee-item" key={`${copy}-${i}`}>
              <Chip token={token} />
              <span className="bc-marquee-sep" aria-hidden="true">
                /
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MarqueeBand() {
  const shouldReduce = useReducedMotion();

  return (
    <div
      className={`bc-marquee ${shouldReduce ? "bc-marquee--static" : ""}`}
      role="img"
      aria-label="Broadcast handles Instagram and X frames, safe-zone crops, fragment captions, idempotent publish, 429 backoff, and signed webhooks."
    >
      <Track tokens={ROW_A} dir="left" />
      <Track tokens={ROW_B} dir="right" />
    </div>
  );
}
