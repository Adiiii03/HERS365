import type { Transition, Variants } from 'framer-motion';

export const springs = {
  press: { type: 'spring', stiffness: 600, damping: 22 },
  snappy: { type: 'spring', stiffness: 500, damping: 32 },
  gentle: { type: 'spring', stiffness: 400, damping: 28 },
  sheet: { type: 'spring', stiffness: 380, damping: 34 },
  page: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
} as const satisfies Record<string, Transition>;

export const durations = {
  fast: 0.15,
  base: 0.2,
  slow: 0.35,
} as const;

export const easing = {
  standard: [0.2, 0.8, 0.2, 1],
  out: [0.16, 1, 0.3, 1],
} as const;

const STAGGER_STEP = 0.05;
const STAGGER_CAP = 8;

export const variants = {
  press: {
    whileTap: { scale: 0.94 },
    transition: springs.press,
  },
  pressStrong: {
    whileTap: { scale: 0.82 },
    transition: springs.press,
  },
  pageTransition: {
    initial: { opacity: 0, y: 10, scale: 0.992 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -4, scale: 1.004 },
    transition: springs.page,
  },
  listStagger: {
    container: {
      hidden: {},
      show: {
        transition: { staggerChildren: STAGGER_STEP, delayChildren: 0 },
      },
    } satisfies Variants,
    item: {
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0, transition: springs.gentle },
    } satisfies Variants,
  },
  sheet: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: springs.sheet,
  },
} as const;

export function staggerDelay(index: number, step = STAGGER_STEP, cap = STAGGER_CAP) {
  return Math.min(index, cap) * step;
}

export function reduced<T extends object>(value: T, reduce: boolean): T | Record<string, never> {
  return reduce ? {} : value;
}

export function pageTransition(reduce: boolean) {
  return reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : variants.pageTransition;
}

export function sheetMotion(reduce: boolean) {
  return reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : variants.sheet;
}
