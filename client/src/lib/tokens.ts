const colors = {
  accent: '#8B3BFF',
  accentHover: '#A66BFF',
  accentText: '#C4A3FF',
  accentOn: '#FFFFFF',

  pink: '#FF2E93',
  pinkText: '#FF6FB3',
  pinkOn: '#0A0A0C',

  neon: '#39FF14',
  neonOn: '#0A0A0C',

  gradientBrand: 'linear-gradient(135deg, #8B3BFF 0%, #FF2E93 100%)',

  success: '#4ade80',
  successText: '#7ee2a8',
  danger: '#ff5a5a',
  dangerText: '#ff9a8a',

  surface0: '#0A0A0C',
  surface1: '#121216',
  surface2: '#1A1A20',
  border: '#2A2A32',
  borderStrong: '#3A3A44',

  textPrimary: '#F5F5F7',
  textSecondary: '#A0A0AB',
  textTertiary: '#6B6B76',
} as const;

const text = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
} as const;

const font = {
  body: "'DM Sans', sans-serif",
  display: "'Barlow Condensed', sans-serif",
} as const;

const size = {
  xs: '0.72rem',
  sm: '0.78rem',
  base: '0.85rem',
  md: '0.95rem',
  lg: '1.125rem',
  xl: '1.375rem',
  '2xl': '1.75rem',
  '3xl': '2.25rem',
  '4xl': '3rem',
} as const;

const weight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

const tracking = {
  display: '-0.03em',
  h1: '-0.025em',
  h2: '-0.02em',
} as const;

const type = { font, size, weight, tracking } as const;

const radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
  button: '12px',
  pill: '9999px',
} as const;

const spacing = {
  space1: '.25rem',
  space2: '.5rem',
  space3: '.75rem',
  space4: '1rem',
  space5: '1.5rem',
  space6: '2rem',
  space7: '3rem',
  space8: '4rem',
  space9: '6rem',
  space10: '8rem',
} as const;

const elevation = {
  elevCard: 'inset 0 1px 0 0 rgba(255,255,255,.05), 0 1px 2px 0 rgba(0,0,0,.4)',
  elevRaised: 'inset 0 1px 0 0 rgba(255,255,255,.07), 0 8px 24px -8px rgba(0,0,0,.6)',
  elevOverlay: 'inset 0 1px 0 0 rgba(255,255,255,.08), 0 24px 64px -16px rgba(0,0,0,.8)',
  accentGlow: '0 0 0 1px rgba(139,59,255,.4), 0 8px 32px -8px rgba(139,59,255,.35)',
  pinkGlow: '0 8px 32px -8px rgba(255,46,147,.35)',
} as const;

export const tokens = {
  colors,
  text,
  type,
  radii,
  spacing,
  elevation,
} as const;

export { colors, text, type, radii, spacing, elevation };

export type Tokens = typeof tokens;
