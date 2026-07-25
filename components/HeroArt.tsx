"use client";

import { PLATFORM_BRAND } from "@/config/platform-brand";

/**
 * Hero side art: an Instagram 1:1 frame and an X 16:9 frame cut from one
 * source. Authored as SVG with a fixed viewBox so it never distorts.
 */
export function HeroArt({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <svg
      className="bc-hero-side-art"
      viewBox="0 0 320 420"
      preserveAspectRatio={isLeft ? "xMinYMid meet" : "xMaxYMid meet"}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`bc-frame-${side}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1d2939" />
          <stop offset="100%" stopColor="#0b1120" />
        </linearGradient>
      </defs>

      {isLeft ? (
        <g>
          <rect x="28" y="54" width="212" height="212" rx="18" fill={`url(#bc-frame-${side})`} />
          <rect
            x="52"
            y="78"
            width="164"
            height="164"
            rx="10"
            fill="none"
            stroke="#FFE4E8"
            strokeWidth="3"
            opacity="0.55"
          />
          <circle cx="216" cy="78" r="9" fill="#E11D48" />
          <g transform="translate(108 130) scale(2.2)" fill="#FF0069" opacity="0.9">
            <path d={PLATFORM_BRAND.instagram.path} />
          </g>
          <g transform="translate(44 274) scale(.58)" fill="#FF0069">
            <path d={PLATFORM_BRAND.instagram.path} />
          </g>
          <text
            x="63"
            y="286"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="11"
            letterSpacing="1.6"
            fill="#667085"
          >
            INSTAGRAM · 1:1
          </text>
          <rect x="28" y="304" width="188" height="9" rx="4.5" fill="#101828" opacity="0.16" />
          <rect x="28" y="322" width="140" height="9" rx="4.5" fill="#101828" opacity="0.1" />
          <rect x="28" y="352" width="96" height="26" rx="13" fill="#E11D48" opacity="0.14" />
        </g>
      ) : (
        <g>
          <rect x="60" y="72" width="236" height="133" rx="16" fill={`url(#bc-frame-${side})`} />
          <rect
            x="82"
            y="90"
            width="192"
            height="97"
            rx="8"
            fill="none"
            stroke="#FFE4E8"
            strokeWidth="3"
            opacity="0.5"
          />
          <circle cx="274" cy="90" r="9" fill="#E11D48" />
          <g transform="translate(166 126) scale(1.15)" fill="#ffffff" opacity="0.92">
            <path d={PLATFORM_BRAND.x.path} />
          </g>
          <g transform="translate(60 216) scale(.58)" fill="#000000">
            <path d={PLATFORM_BRAND.x.path} />
          </g>
          <text
            x="79"
            y="228"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="11"
            letterSpacing="1.6"
            fill="#667085"
          >
            X · 16:9
          </text>
          <rect x="60" y="246" width="200" height="9" rx="4.5" fill="#101828" opacity="0.16" />
          <rect x="60" y="264" width="152" height="9" rx="4.5" fill="#101828" opacity="0.1" />
          <g opacity="0.9">
            <rect x="60" y="296" width="236" height="70" rx="14" fill="#ffffff" stroke="#E4E7EC" />
            <circle cx="86" cy="318" r="6" fill="#15803D" />
            <text
              x="100"
              y="322"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="10"
              letterSpacing="1.4"
              fill="#667085"
            >
              PUBLISHED
            </text>
            <rect x="74" y="336" width="150" height="8" rx="4" fill="#101828" opacity="0.12" />
          </g>
        </g>
      )}
    </svg>
  );
}
