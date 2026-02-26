/**
 * Custom React hooks for animations.
 *
 * useScrollNavbar  — scroll-aware navbar shrink + shadow
 * useScrollReveal  — triggers when element enters viewport
 * useCountUp       — animates number from 0 → target
 * useStaggerDelay  — returns sequential delay for list items
 */

import { useEffect, useState, useRef } from "react";
import {
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  type MotionValue,
} from "framer-motion";

// ── useScrollNavbar ──────────────────────────────────────────

interface NavbarScrollState {
  scrolled: boolean;
  hidden: boolean;
}

/**
 * Returns scroll state for navbar:
 * - `scrolled` — true when user has scrolled past threshold (used for visual shrink)
 * - `hidden` — true when scrolling down (auto-hide)
 */
export function useScrollNavbar(
  threshold = 40,
  hideThreshold = 200,
): NavbarScrollState {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > threshold);
      if (y > hideThreshold) {
        setHidden(y > lastScroll.current);
      } else {
        setHidden(false);
      }
      lastScroll.current = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold, hideThreshold]);

  return { scrolled, hidden };
}

// ── useCountUp ───────────────────────────────────────────────

/**
 * Animates a number from 0 to `target` over `duration` seconds,
 * triggered when element is in view.
 */
export function useCountUp(
  target: number,
  durationMs = 800,
): { ref: React.RefObject<HTMLElement | null>; value: MotionValue<number> } {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref as React.RefObject<HTMLElement>, {
    once: true,
  });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    duration: durationMs,
    bounce: 0,
  });

  useEffect(() => {
    if (isInView) {
      motionVal.set(target);
    }
  }, [isInView, motionVal, target]);

  return { ref, value: springVal };
}

// ── useParallax ──────────────────────────────────────────────

/**
 * Returns a motion value for parallax movement based on scroll position.
 * `factor` controls parallax strength (0.1 = subtle, 0.5 = strong).
 */
export function useParallax(factor = 0.2): {
  ref: React.RefObject<HTMLElement | null>;
  y: MotionValue<number>;
} {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref as React.RefObject<HTMLElement>,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [factor * 100, factor * -100],
  );

  return { ref, y };
}

// ── useReducedMotion check ───────────────────────────────────

/**
 * Returns true if user prefers reduced motion (OS setting).
 * When true, all animations should be instant / disabled.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
