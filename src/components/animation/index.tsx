/**
 * Reusable animation wrapper components.
 *
 * <PageTransition>   — wrap page content for route transitions
 * <StaggerContainer> — parent for staggered child reveals
 * <StaggerItem>      — individual staggered child
 * <ScrollReveal>     — reveal when scrolling into viewport
 * <FadeIn>           — simple opacity fade
 * <ScaleIn>          — scale + opacity entrance
 * <AnimatedCounter>  — number count-up on viewport enter
 */

import React from "react";
import { motion } from "framer-motion";
import {
  pageVariants,
  pageTransition,
  staggerContainer,
  staggerItem,
  staggerScaleItem,
  scrollReveal,
  easing,
  duration,
} from "../../lib/motion";
import { useCountUp } from "../../hooks/useAnimations";

// ── PageTransition ───────────────────────────────────────────

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerContainer ─────────────────────────────────────────

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerMs?: number;
  delayMs?: number;
  /** Trigger via viewport intersection (like whileInView) */
  viewport?: boolean;
}

export function StaggerContainer({
  children,
  className,
  staggerMs = 60,
  delayMs = 100,
  viewport = false,
}: StaggerContainerProps) {
  const viewportProps = viewport
    ? {
        initial: "initial" as const,
        whileInView: "animate" as const,
        viewport: { once: true, amount: 0.1 },
      }
    : { initial: "initial" as const, animate: "animate" as const };

  return (
    <motion.div
      variants={staggerContainer(staggerMs, delayMs)}
      {...viewportProps}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerItem ──────────────────────────────────────────────

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  /** Use scale variant for cards */
  scale?: boolean;
}

export function StaggerItem({
  children,
  className,
  scale = false,
}: StaggerItemProps) {
  return (
    <motion.div
      variants={scale ? staggerScaleItem : staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── ScrollReveal ─────────────────────────────────────────────

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollReveal({
  children,
  className,
  delay,
}: ScrollRevealProps) {
  const variants = delay
    ? {
        hidden: scrollReveal.hidden,
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0, 0, 0.58, 1],
            delay,
          },
        },
      }
    : scrollReveal;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── FadeIn ───────────────────────────────────────────────────

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  durationS?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  durationS = duration.slow,
  direction = "up",
  distance = 16,
}: FadeInProps) {
  const axis = direction === "up" || direction === "down" ? "y" : "x";
  const sign =
    direction === "up" || direction === "left" ? distance : -distance;
  const offset = direction === "none" ? {} : { [axis]: sign };

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, [axis]: 0 }}
      transition={{ duration: durationS, ease: easing.apple, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── ScaleIn ──────────────────────────────────────────────────

interface ScaleInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: duration.slow,
        ease: easing.spring,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedCounter ──────────────────────────────────────────

interface AnimatedCounterProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}

export function AnimatedCounter({
  value: target,
  className,
  prefix = "",
  suffix = "",
  durationMs = 800,
}: AnimatedCounterProps) {
  const { ref, value } = useCountUp(target, durationMs);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      <motion.span>{value}</motion.span>
      {suffix}
    </motion.span>
  );
}
