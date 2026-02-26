/**
 * BDD Dashboard — Motion Design System
 *
 * Apple-inspired animation constants, Framer Motion variants,
 * and reusable transition presets.
 *
 * Easing reference:
 *   Apple:   cubic-bezier(0.4, 0, 0.2, 1) — fluid, natural
 *   Spring:  cubic-bezier(0.34, 1.56, 0.64, 1) — playful overshoot
 *   EaseOut: cubic-bezier(0, 0, 0.58, 1) — elements entering
 *   EaseIn:  cubic-bezier(0.42, 0, 1, 1) — elements exiting
 */

import type { Transition, Variants } from "framer-motion";

// ── Easing curves ────────────────────────────────────────────
export const easing = {
  apple: [0.4, 0, 0.2, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
  easeOut: [0, 0, 0.58, 1] as const,
  easeIn: [0.42, 0, 1, 1] as const,
  easeInOut: [0.42, 0, 0.58, 1] as const,
};

// ── Duration tokens (ms → s) ─────────────────────────────────
export const duration = {
  instant: 0.05,
  fast: 0.1,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
  page: 0.6,
};

// ── Prebuilt transitions ─────────────────────────────────────
export const transition = {
  apple: { duration: duration.normal, ease: easing.apple } as Transition,
  appleSlow: { duration: duration.slow, ease: easing.apple } as Transition,
  spring: { duration: duration.fast, ease: easing.spring } as Transition,
  springMedium: {
    duration: duration.normal,
    ease: easing.spring,
  } as Transition,
  springToast: { duration: duration.slow, ease: easing.spring } as Transition,
  fast: { duration: duration.fast, ease: easing.apple } as Transition,
  pageEnter: { duration: duration.page, ease: easing.easeOut } as Transition,
};

// ── Page-level variants ──────────────────────────────────────

/** Fade + slide up for page content on route change */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition: Transition = {
  duration: duration.slow,
  ease: easing.apple,
};

// ── Stagger containers ───────────────────────────────────────

/** Parent container that staggers its children */
export const staggerContainer = (staggerMs = 60, delayMs = 100): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerMs / 1000,
      delayChildren: delayMs / 1000,
    },
  },
});

/** Individual stagger child — fade + translate up */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.easeOut },
  },
};

/** Stagger child — fade + scale (for cards) */
export const staggerScaleItem: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slow, ease: easing.apple },
  },
};

// ── Scroll-reveal variants ───────────────────────────────────

export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slower, ease: easing.easeOut },
  },
};

export const scrollRevealScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slower, ease: easing.easeOut },
  },
};

// ── Component-level variants ─────────────────────────────────

/** Modal overlay */
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Modal panel — scale + translate + fade */
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

export const modalTransition: Transition = {
  duration: 0.15,
  ease: easing.apple,
};

/** Dropdown — slide down with spring */
export const dropdownVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
};

export const dropdownTransition: Transition = {
  duration: duration.fast,
  ease: easing.spring,
};

/** Toast — slide from top with spring */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: -20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
};

/** Expand/collapse — for scenario cards, FAQ answers */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

export const collapseTransition: Transition = {
  duration: duration.slow,
  ease: easing.apple,
};

/** Card hover — implemented via whileHover */
export const cardHover = {
  y: -2,
  transition: { duration: duration.normal, ease: easing.apple },
};

/** Button press — implemented via whileTap */
export const buttonTap = {
  scale: 0.98,
  transition: { duration: duration.fast },
};

/** Tag pill pop-in */
export const tagPopIn: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.normal, ease: easing.spring },
  },
};

/** Sidebar collapse animation */
export const sidebarTransition: Transition = {
  duration: duration.slow,
  ease: easing.apple,
};

/** Board card entrance — scale + fade */
export const boardCardVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: easing.easeOut },
  },
};

/** SVG connection line draw-in */
export const lineDrawVariants: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: duration.slower, ease: easing.easeOut },
  },
};

/** FAB scale-in with spring */
export const fabVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { duration: duration.slow, ease: easing.spring, delay: 0.3 },
  },
};

/** File drop zone pulse on drag-over */
export const dropZoneActive: Variants = {
  idle: { borderColor: "var(--color-border)", backgroundColor: "transparent" },
  active: {
    borderColor: "var(--color-primary)",
    backgroundColor: "var(--color-primary-muted)",
  },
};

/** Number counter — for stat cards */
export const counterTransition: Transition = {
  duration: 0.8,
  ease: easing.apple,
};

/** Hero stagger children */
export const heroContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export const heroItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easing.apple },
  },
};

export const heroMockup: Variants = {
  initial: { opacity: 0, y: 40, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: easing.apple, delay: 0.3 },
  },
};

/** Empty state floating bob animation */
export const floatingBob = {
  y: [0, -4, 0],
  transition: {
    duration: 3,
    ease: "easeInOut" as const,
    repeat: Infinity,
  },
};

/** Shake animation for auth error */
export const shakeVariants: Variants = {
  shake: {
    x: [0, -8, 8, -4, 4, 0],
    transition: { duration: 0.4, ease: easing.apple },
  },
};

/** Navbar shrink on scroll */
export const navbarShrinkStyle = (scrolled: boolean, dark = false) =>
  ({
    height: scrolled ? 56 : 64,
    backdropFilter: scrolled ? "blur(12px)" : "none",
    backgroundColor: scrolled
      ? dark
        ? "rgba(9,9,11,0.92)"
        : "rgba(255,255,255,0.92)"
      : "var(--color-background)",
    borderBottomColor: scrolled ? "var(--color-border)" : "transparent",
  }) as const;
