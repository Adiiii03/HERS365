import type { CSSProperties } from 'react';
import { colors } from '../../lib/tokens';

// Shared plan catalog for the parent Billing funnel (plans page + checkout + receipt).
// Per-tier look read from Valerie's billing SVG (verified against BILLING & SUBSCRIPTIONS.css):
// darker tinted fills, very faint borders, a diagonal gloss, and accent colors on the
// label/checks/border/button/divider — NOT on the price (prices stay white). Purple is the
// mockup's #7C5CFC here (a deliberate per-page exception to the app's #8B3BFF accent).
export const PURPLE = '#7C5CFC';
export const BLUE = '#3B82F6';
export const PINK = '#F472B6';

export type PlanSlug = 'rookie' | 'pro' | 'elite' | 'elite-yearly';

export interface Plan {
  slug: PlanSlug;
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  cta: string;
  popular?: boolean;
  bg: string;              // card fill
  border: string;          // full border CSS
  labelColor: string;      // plan label + feature checks (Rookie reads neutral)
  accent: string;          // vivid tier color (icons, embedded-card label)
  accentRgb: string;       // "r, g, b" for the gloss + divider
  glossAlpha: number;      // gloss strength (paid .20, Rookie white .102)
  divider: string;         // faint per-tier divider
  button: CSSProperties;
}

export const PLANS: Plan[] = [
  {
    slug: 'rookie',
    name: 'Rookie', price: 'Free', period: '', blurb: 'Get on the grid.', cta: 'Start Free',
    bg: '#111111', border: '1px solid rgba(255,255,255,0.0784)',
    labelColor: colors.textSecondary, accent: colors.textSecondary, accentRgb: '255, 255, 255', glossAlpha: 0.102,
    divider: 'rgba(255,255,255,0.0588)',
    button: { background: 'rgba(255,255,255,0.0588)', border: '1px solid rgba(255,255,255,0.0784)', color: '#fff' },
    features: [
      'Athlete profile (public)',
      'HERS365 community access',
      'Up to 3 highlight uploads',
      'Basic college program search',
      'HERS rankings listing',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro', price: '$29.99', period: '/mo', blurb: 'Get seen. Get recruited.', cta: 'Get Pro', popular: true,
    bg: '#1A1128', border: `2px solid ${PURPLE}`,
    labelColor: PURPLE, accent: PURPLE, accentRgb: '124, 92, 252', glossAlpha: 0.20,
    divider: 'rgba(124,92,252,0.149)',
    button: { background: PURPLE, border: `1px solid ${PURPLE}`, color: '#fff' },
    features: [
      'Everything in Rookie',
      'Unlimited highlight uploads',
      'Coach contact & DM access',
      'Performance analytics dashboard',
      'Priority ranking visibility',
      'College-fit matching tool',
    ],
  },
  {
    slug: 'elite',
    name: 'Elite', price: '$69.99', period: '/mo', blurb: 'The full recruiting toolkit.', cta: 'Get Elite',
    bg: '#111111', border: '1px solid rgba(59,130,246,0.0784)',
    labelColor: BLUE, accent: BLUE, accentRgb: '59, 130, 246', glossAlpha: 0.20,
    divider: 'rgba(59,130,246,0.0588)',
    button: { background: 'rgba(59,130,246,0.0588)', border: '1px solid rgba(59,130,246,0.0784)', color: BLUE },
    features: [
      'Everything in Pro',
      'Verified HERS365 badge',
      'NIL deal tracker & marketplace',
      'School spotlight placement',
      'Dedicated recruiting advisor',
      'Early access to new features',
    ],
  },
  {
    slug: 'elite-yearly',
    name: 'Elite Yearly', price: '$499.99', period: '/yr', blurb: 'Best value, 2 months free.', cta: 'Get Elite Yearly',
    bg: '#1A0A0A', border: '1px solid rgba(244,114,182,0.149)',
    labelColor: PINK, accent: PINK, accentRgb: '244, 114, 182', glossAlpha: 0.20,
    divider: 'rgba(244,114,182,0.0588)',
    button: { background: 'rgba(244,114,182,0.149)', border: '1px solid rgba(244,114,182,0.251)', color: PINK },
    features: [
      'Everything in Elite',
      'Best value - 2 months free',
      'Priority support & onboarding',
      'Annual recruiting strategy session',
      'Exclusive yearly member perks',
    ],
  },
];

export function planBySlug(slug: string | undefined): Plan | undefined {
  return PLANS.find(p => p.slug === slug);
}
