// DEPRECATED: use src/lib/tokens.ts. This shim re-exports canonical values for
// its two remaining importers (pages/Feed.tsx, pages/ComingSoon.tsx).
import type { CSSProperties } from 'react';
import { colors, text, type as typography } from './tokens';

export const FLAME = colors.accent;
export const FLAME_SOFT = colors.accentHover;
export const PINK = colors.pink;
export const PINK_SOFT = colors.pinkText;
export const NEON = colors.neon;
export const INK = '#161616';
export const INK_2 = '#111111';
export const INK_3 = '#0d0d0d';
export const LINE = 'rgba(255,255,255,0.08)';
export const LINE_2 = 'rgba(255,255,255,0.05)';
export const MUTED = text.secondary;
export const MUTED_2 = text.tertiary;
export const DISP = typography.font.display;
export const BODY = typography.font.body;

export const disp: CSSProperties = { fontFamily: DISP };

export const kicker: CSSProperties = {
  fontFamily: DISP,
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: MUTED,
};

export function glowBlob({
  size = 200,
  top = 0,
  right = 0,
  opacity = 0.4,
  strength = 0.5,
}: {
  size?: number;
  top?: number;
  right?: number;
  opacity?: number;
  strength?: number;
}): CSSProperties {
  return {
    position: 'absolute',
    width: size,
    height: size,
    top,
    right,
    borderRadius: '50%',
    background: `radial-gradient(circle, rgba(139,59,255,${opacity * strength}) 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
  };
}

// data-reveal makes the CSS resilience rule (html:not(.js-ready) [data-reveal])
// hold this element at the visible state until JS confirms it can run the
// framer-motion enter. See LandingPage.tsx useEffect for the .js-ready signal.
export const reveal = {
  'data-reveal': true,
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};
