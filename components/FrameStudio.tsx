"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PLATFORM_SPECS, type PlatformKey } from "@/config/platform-specs";
import { cropFractions, SUBJECT_RATIO } from "@/lib/images/geometry";
import { mediaUrl } from "@/lib/media";
import { PlatformIcon } from "@/components/PlatformIcon";

type FramePost = {
  id: string;
  platform: string;
  imagePath: string;
  status: string;
  updatedAt?: string;
};

function isPlatformKey(value: string): value is PlatformKey {
  return value in PLATFORM_SPECS;
}

/**
 * The product metaphor made literal: one master image on the left, the crop
 * each platform takes drawn on top of it, and the rendered results at true
 * relative size in a scrollable rail.
 */
export function FrameStudio({
  campaignId,
  posts,
}: {
  campaignId: string;
  posts: FramePost[];
}) {
  const shouldReduce = useReducedMotion();
  const keys = posts.map((p) => p.platform).filter(isPlatformKey);
  const [cursor, setCursor] = useState(0);
  const [pinned, setPinned] = useState<PlatformKey | null>(null);

  useEffect(() => {
    setCursor(0);
    setPinned(null);
  }, [campaignId]);

  useEffect(() => {
    if (shouldReduce || pinned || keys.length < 2) return;
    const timer = setInterval(() => {
      setCursor((c) => (c + 1) % keys.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [shouldReduce, pinned, keys.length]);

  if (keys.length === 0) return null;

  const focused = pinned ?? keys[cursor % keys.length];
  const crop = cropFractions(focused);
  const spec = PLATFORM_SPECS[focused];
  const subjectInset = `${((1 - SUBJECT_RATIO) / 2) * 100}%`;

  return (
    <div className="bc-studio">
      <div className="bc-studio-master">
        <p className="bc-studio-label">
          Master source · 2000x2000
        </p>
        <div className="bc-master">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(`storage/variants/${campaignId}/source.png`)}
            alt="Master source image before any platform crop"
          />
          <span
            className="bc-subject-box"
            style={{ inset: subjectInset }}
            aria-hidden="true"
          />
          <motion.span
            className="bc-crop-box"
            aria-hidden="true"
            initial={false}
            animate={{
              left: `${crop.left * 100}%`,
              top: `${crop.top * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
            }}
            transition={
              shouldReduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 26 }
            }
          >
            {/* Keyed so the label fades in with the box instead of jumping
                ahead of the geometry it describes. */}
            <motion.span
              key={focused}
              className="bc-crop-tag"
              initial={shouldReduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
            >
              <PlatformIcon platform={focused} className="h-3 w-3" />
              {spec.label} · {spec.aspect}
            </motion.span>
          </motion.span>
        </div>
        <p className="text-[11px] text-muted leading-relaxed">
          The dashed box is the subject every crop must keep. {spec.label} pulls in{" "}
          {Math.round(spec.safeZoneInset * 100)}% on each edge, so nothing important
          lands under a platform overlay.
        </p>
      </div>

      <div className="bc-studio-rail">
        <p className="bc-studio-label">
          Rendered frames · true relative size
        </p>
        <div
          className="bc-rail signal-scroll"
          role="list"
          onMouseLeave={() => setPinned(null)}
        >
          {posts.filter((p) => isPlatformKey(p.platform)).map((post) => {
            const key = post.platform as PlatformKey;
            const s = PLATFORM_SPECS[key];
            const active = focused === key;
            return (
              <button
                key={post.id}
                type="button"
                role="listitem"
                className={`bc-rail-item ${active ? "is-active" : ""}`}
                onMouseEnter={() => setPinned(key)}
                onFocus={() => setPinned(key)}
                onClick={() => setPinned(key)}
                aria-label={`Show the ${s.label} crop on the master image`}
              >
                <span
                  className="bc-rail-thumb"
                  style={{ width: `${(s.width / s.height) * 132}px` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${mediaUrl(post.imagePath)}?v=${post.updatedAt ?? ""}`}
                    alt={`${s.label} variant at ${s.width} by ${s.height} pixels`}
                  />
                </span>
                <span className="bc-rail-meta">
                  <PlatformIcon platform={key} className="h-3 w-3" />
                  {s.aspect}
                  <span className="text-muted">{s.width}x{s.height}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted leading-relaxed">
          Thumbnails keep their real proportions, so a 16:9 frame is visibly wider
          than a 1:1 one. Hover or focus a frame to draw its crop on the master.
        </p>
      </div>
    </div>
  );
}
