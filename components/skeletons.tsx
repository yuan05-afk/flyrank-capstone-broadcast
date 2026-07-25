/**
 * Shared skeleton primitives. Shimmer is CSS-only so idle pages pay nothing.
 */

import type { CSSProperties } from "react";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={`bc-skel ${className}`} style={style} aria-hidden="true" />;
}

export function LandingSkeleton() {
  return (
    <div className="bc-skel-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading Broadcast</span>
      <header className="border-b border-line/80 bg-canvas/80">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <Skeleton className="h-7 w-36 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-5 py-24 text-center space-y-5">
        <Skeleton className="h-6 w-44 rounded-full mx-auto" />
        <Skeleton className="h-12 w-[min(100%,28rem)] rounded-2xl mx-auto" />
        <Skeleton className="h-12 w-[min(100%,22rem)] rounded-2xl mx-auto" />
        <Skeleton className="h-4 w-[min(100%,26rem)] rounded-lg mx-auto" />
        <div className="flex justify-center gap-3 pt-2">
          <Skeleton className="h-11 w-36 rounded-xl" />
          <Skeleton className="h-11 w-28 rounded-xl" />
        </div>
      </div>
      <div className="border-y border-line py-4">
        <div className="flex gap-3 overflow-hidden px-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="bc-skel-page min-h-screen hero-mesh flex flex-col" aria-busy="true">
      <span className="sr-only">Loading sign in</span>
      <header className="px-6 py-5 max-w-6xl mx-auto w-full">
        <Skeleton className="h-7 w-36 rounded-lg" />
      </header>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="surface w-full max-w-md p-7 space-y-4">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <Skeleton className="h-11 w-full rounded-xl mt-2" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function DeskSkeleton() {
  return (
    <div className="bc-skel-page min-h-screen hero-mesh" aria-busy="true">
      <span className="sr-only">Loading campaign desk</span>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Skeleton className="h-7 w-36 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-[min(100%,28rem)] rounded-lg" />
        </div>

        <div className="grid lg:grid-cols-5 gap-4 items-start">
          <div className="surface p-5 lg:col-span-2 space-y-3">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>

          <div className="surface p-5 lg:col-span-3 space-y-4">
            <div className="flex justify-between gap-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-7 w-2/3 rounded-xl" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>

            <div className="grid sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4 border-y border-line py-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="flex gap-3 overflow-hidden">
                <Skeleton className="h-[132px] w-[132px] shrink-0 rounded-xl" />
                <Skeleton className="h-[132px] w-[220px] shrink-0 rounded-xl" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="border border-line rounded-2xl overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </div>
              <div className="border border-line rounded-2xl overflow-hidden">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact board placeholder used when switching between recent campaigns. */
export function BoardPanelSkeleton() {
  return (
    <div className="surface p-5 space-y-4" aria-busy="true">
      <span className="sr-only">Loading campaign</span>
      <div className="flex justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-7 w-2/3 rounded-xl" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
      <div className="grid sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4 border-y border-line py-4">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-[132px] w-[132px] shrink-0 rounded-xl" />
          <Skeleton className="h-[132px] w-[220px] shrink-0 rounded-xl" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="border border-line rounded-2xl overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
        <div className="border border-line rounded-2xl overflow-hidden">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
