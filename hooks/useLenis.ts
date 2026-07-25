"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "framer-motion";

export function useLenis() {
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (shouldReduce) return;
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.6,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.2,
    });
    return () => lenis.destroy();
  }, [shouldReduce]);
}

export function scrollToTop(lenisLike?: { scrollTo: Function } | null) {
  if (lenisLike?.scrollTo) {
    lenisLike.scrollTo(0, { duration: 1.2 });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
