"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type BroadcastToastTone = "info" | "success" | "error";

export type BroadcastToastItem = {
  id: number;
  tone: BroadcastToastTone;
  title: string;
  detail?: string;
};

const TONE_META: Record<
  BroadcastToastTone,
  { label: string; icon: "frame" | "live" | "fail" }
> = {
  info: { label: "Studio", icon: "frame" },
  success: { label: "Live", icon: "live" },
  error: { label: "Blocked", icon: "fail" },
};

function ToneMark({ tone }: { tone: BroadcastToastTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 24 24" className="bc-notice-mark-svg" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M7.5 12.2l3 3 6-6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18.2" cy="5.8" r="2.1" fill="currentColor" />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg viewBox="0 0 24 24" className="bc-notice-mark-svg" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="18.2" cy="5.8" r="2.1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="bc-notice-mark-svg" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <circle cx="18.2" cy="5.8" r="2.1" fill="currentColor" />
    </svg>
  );
}

function NoticeCard({
  toast,
  onDismiss,
  lifetimeMs,
}: {
  toast: BroadcastToastItem;
  onDismiss: (id: number) => void;
  lifetimeMs: number;
}) {
  const shouldReduce = useReducedMotion();
  const meta = TONE_META[toast.tone];

  return (
    <motion.article
      layout
      role="status"
      aria-live="polite"
      className={`bc-notice bc-notice--${toast.tone}`}
      initial={
        shouldReduce
          ? { opacity: 0 }
          : { opacity: 0, y: 28, x: 18, scale: 0.94, filter: "blur(8px)" }
      }
      animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
      exit={
        shouldReduce
          ? { opacity: 0 }
          : { opacity: 0, y: 12, x: 40, scale: 0.92, filter: "blur(6px)" }
      }
      transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.8 }}
    >
      <div className="bc-notice-corner" aria-hidden="true" />
      <div className="bc-notice-body">
        <div className={`bc-notice-mark bc-notice-mark--${toast.tone}`}>
          <ToneMark tone={toast.tone} />
        </div>
        <div className="bc-notice-copy min-w-0">
          <div className="bc-notice-meta">
            <span className="bc-notice-label">{meta.label}</span>
            <span className="bc-notice-sep" aria-hidden="true">
              ·
            </span>
            <span className="bc-notice-clock">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
          <p className="bc-notice-title">{toast.title}</p>
          {toast.detail && <p className="bc-notice-detail">{toast.detail}</p>}
        </div>
        <button
          type="button"
          className="bc-notice-close"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {!shouldReduce && (
        <motion.span
          className="bc-notice-progress"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: lifetimeMs / 1000, ease: "linear" }}
          style={{ transformOrigin: "left center" }}
          aria-hidden="true"
        />
      )}
    </motion.article>
  );
}

export function BroadcastToastStack({
  toasts,
  onDismiss,
  lifetimeMs = 5200,
}: {
  toasts: BroadcastToastItem[];
  onDismiss: (id: number) => void;
  lifetimeMs?: number;
}) {
  return (
    <div className="bc-notice-stack" aria-label="Studio notifications">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <NoticeCard
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            lifetimeMs={lifetimeMs}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
