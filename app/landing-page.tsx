"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  ImageIcon,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
import { BrandLockup } from "@/components/BrandMark";
import { HeroArt } from "@/components/HeroArt";
import { MarqueeBand } from "@/components/MarqueeBand";
import { PlatformIcon } from "@/components/PlatformIcon";
import { useLenis } from "@/hooks/useLenis";

const EASE = [0.22, 1, 0.36, 1] as const;

function ScrollChapter({
  children,
  className = "",
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  labelledBy: string;
}) {
  return (
    <section className={className} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

export default function LandingPage() {
  const shouldReduce = useReducedMotion();
  useLenis();

  return (
    <main className="relative overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <BrandLockup />
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link href="/campaigns" className="btn-primary !text-sm !py-2">
              Open studio
            </Link>
          </div>
        </div>
      </header>

      <ScrollChapter
        className="relative min-h-[calc(84svh-56px)] flex items-center"
        labelledBy="hero-title"
      >
        <div className="bc-hero-backdrop" aria-hidden="true">
          <div className="bc-hero-sides">
            <div className="bc-hero-side bc-hero-side--left">
              <HeroArt side="left" />
            </div>
            <div className="bc-hero-side bc-hero-side--right">
              <HeroArt side="right" />
            </div>
          </div>
          <div className="bc-hero-wash" />
        </div>

        <div className="bc-hero-content max-w-3xl mx-auto px-5 sm:px-6 py-20 text-center w-full">
          <div className="section-intro-badge mx-auto mb-5">
            <span className="signal-status-dot" />
            Social campaign studio
          </div>
          <h1
            id="hero-title"
            className="font-display font-bold tracking-tight leading-[1.05] text-ink text-balance mb-6"
          >
            <motion.span
              className="block text-[2.35rem] sm:text-5xl md:text-[3.6rem]"
              initial={shouldReduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              One post.
            </motion.span>
            <motion.span
              className="block text-[2.35rem] sm:text-5xl md:text-[3.6rem] hero-gradient-text"
              initial={shouldReduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.12, duration: 0.7, ease: EASE }}
            >
              Every frame ready.
            </motion.span>
          </h1>
          <p className="text-muted text-[0.98rem] max-w-xl mx-auto leading-relaxed mb-8">
            Broadcast turns a blog post into platform-sized images and tailored
            captions, then publishes through adapters that stay idempotent,
            rate-limit aware, and sandbox-safe.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/campaigns" className="btn-primary">
              Make a campaign
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold hover:border-broadcast/40 transition-colors"
            >
              Sign in to studio
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
            Demo key · broadcast_demo_key_001
          </p>
        </div>
      </ScrollChapter>

      <MarqueeBand />

      <ScrollChapter className="py-16 md:py-20" labelledBy="how-heading">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="mb-8">
            <div className="section-intro-badge mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              How it works
            </div>
            <h2 id="how-heading" className="font-display text-3xl font-bold tracking-tight">
              Compose, crop, queue, confirm.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                n: "01",
                title: "Fragment captions",
                body: "Shared openers plus platform voice fragments - Instagram stays visual, X stays punchy.",
                platforms: ["instagram", "x"],
              },
              {
                n: "02",
                title: "Safe-zone variants",
                body: "One source becomes 1:1 and 16:9 with the subject kept inside the crop inset.",
                platforms: ["instagram", "x"],
              },
              {
                n: "03",
                title: "Adapter publish",
                body: "SocialPublisher drives fake Instagram and X - idempotent keys, 429 backoff, signed webhooks.",
                platforms: ["instagram", "x"],
              },
            ].map((step, i) => (
              <motion.article
                key={step.n}
                tabIndex={0}
                className="surface p-6 outline-none transition-all duration-200 hover:-translate-y-1 hover:border-broadcast/35 focus-visible:ring-2 focus-visible:ring-broadcast/30"
                initial={shouldReduce ? {} : { opacity: 0, y: 28 }}
                whileInView={shouldReduce ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
              >
                <p className="font-mono text-[10px] tracking-[0.18em] text-broadcast mb-3">
                  STEP {step.n}
                </p>
                <h3 className="font-display font-semibold text-lg mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{step.body}</p>
                <div className="mt-4 flex items-center gap-2" aria-label="Supported platforms">
                  {step.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-canvas"
                    >
                      <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </ScrollChapter>

      <ScrollChapter
        className="py-16 md:py-20 bg-surface/60 border-y border-line"
        labelledBy="trust-heading"
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="mb-8">
            <div className="section-intro-badge mb-3">
              <Shield className="w-3.5 h-3.5" />
              Built to ship
            </div>
            <h2 id="trust-heading" className="font-display text-3xl font-bold tracking-tight">
              Publishing promises you can verify.
            </h2>
          </div>
          <div className="surface overflow-hidden !p-0">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Lock,
                  label: "Tokens",
                  value: "Encrypted",
                  description: "AES-256-GCM with a random IV on every write.",
                },
                {
                  icon: CheckCircle2,
                  label: "Retries",
                  value: "Idempotent",
                  description: "Same campaign + platform key yields one remote post.",
                },
                {
                  icon: Clock3,
                  label: "Limits",
                  value: "429 aware",
                  description: "Adapters honor Retry-After and back off.",
                },
                {
                  icon: ImageIcon,
                  label: "Delivery",
                  value: "Signed",
                  description: "Forged webhooks get 400. Valid ones flip status.",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.label}
                    tabIndex={0}
                    className="group p-6 border-line sm:border-r last:border-r-0 border-b lg:border-b-0 outline-none"
                    initial={shouldReduce ? {} : { opacity: 0, y: 24 }}
                    whileInView={shouldReduce ? {} : { opacity: 1, y: 0 }}
                    whileHover={
                      shouldReduce ? {} : { backgroundColor: "rgba(225, 29, 72, 0.045)" }
                    }
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06, duration: 0.45, ease: EASE }}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <Icon className="w-5 h-5 text-muted group-hover:text-broadcast transition-colors" />
                      <span className="font-mono text-[9px] tracking-[0.14em] text-ok uppercase">
                        Pass 0{index + 1}
                      </span>
                    </div>
                    <p className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase mb-2">
                      {item.label}
                    </p>
                    <p className="font-display text-lg font-bold mb-2 group-hover:text-broadcast transition-colors">
                      {item.value}
                    </p>
                    <p className="text-[0.76rem] leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollChapter>

      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <BrandMarkSpacer />
          <h2 className="font-display text-3xl font-bold tracking-tight mb-3">
            Ready to frame a campaign?
          </h2>
          <p className="text-muted text-sm mb-6">
            Sign in with the demo key, paste a blog post, and publish against the
            fake platform - never a live account.
          </p>
          <Link href="/campaigns" className="btn-primary">
            Open studio
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between gap-4">
          <BrandLockup />
          <p className="text-xs text-muted">Sandbox-first social publishing</p>
        </div>
      </footer>
    </main>
  );
}

function BrandMarkSpacer() {
  return (
    <div className="inline-flex justify-center mb-4">
      <div className="scale-110">
        {/* reuse lockup mark only */}
        <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="2" y="2" width="60" height="60" rx="14" fill="#101828" />
          <rect x="14" y="14" width="36" height="36" rx="8" stroke="#F7F8FC" strokeWidth="4" fill="none" />
          <circle cx="50" cy="14" r="3.75" fill="#E11D48" />
        </svg>
      </div>
    </div>
  );
}
