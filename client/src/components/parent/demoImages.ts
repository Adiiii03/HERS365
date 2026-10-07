// Demo-only placeholder imagery for the parent portal, served from public/parent-demo.
// These are AI mock photos (from Valerie's Figma export), NOT production art: they fill
// avatars and film/feed thumbnails so the portal doesn't show bare initials/placeholders
// while the real media/data layer isn't wired. Scoped to the parent portal; never written
// to the DB. Swap or remove freely.

export const DEMO_HEADSHOTS = [
  '/parent-demo/headshot-1.png',
  '/parent-demo/headshot-2.png',
  '/parent-demo/headshot-3.png',
];

// Deterministic headshot for an athlete that has no real profileImage, keyed by a stable
// value (player id, or a list index) so the same person always gets the same face.
export function demoHeadshot(key: number): string {
  return DEMO_HEADSHOTS[Math.abs(Math.trunc(key)) % DEMO_HEADSHOTS.length];
}

// Neutral initials avatar as an inline SVG data-URI, so the `<img src>` fallback
// pattern still works with no conditional render at the call site. Used for a REAL
// child who has no uploaded profileImage: they get their own initials on a muted
// tile, never a stranger's stock face.
export function initialsAvatar(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const letters = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '') || '?').toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>` +
    `<rect width='128' height='128' fill='#2A2342'/>` +
    `<text x='50%' y='52%' fill='#C9B8FF' font-family='system-ui,sans-serif' font-size='56' ` +
    `font-weight='600' text-anchor='middle' dominant-baseline='middle'>${letters}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Maya Thompson is our primary demo child (parent.maya@hers365.com). She has no real
// profileImage on /children, so give her a specific correct headshot in demo mode.
// Real (non-demo) children with no photo get initials, never a stock stranger face.
export const MAYA_HEADSHOT = '/parent-demo/maya-headshot.jpg';
export function athleteHeadshot(
  name: string | null | undefined,
  key: number,
  demo = false,
): string {
  if (!demo) return initialsAvatar(name);
  const first = (name ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return first === 'maya' ? MAYA_HEADSHOT : demoHeadshot(key);
}

// Wide hero film banner (football) + square-ish film thumbnails for My Athletes.
export const DEMO_FILM_HERO = '/parent-demo/action-football-1.png';
export const DEMO_FILMS = [
  '/parent-demo/film-1.jpg',
  '/parent-demo/film-2.jpg',
  '/parent-demo/film-3.jpg',
  '/parent-demo/film-4.jpg',
];

// Wide thumbnails for the Grid "Latest Drop" feed posts, by index.
export const DEMO_FEED = [
  '/parent-demo/action-football-2.png',
  '/parent-demo/action-track.png',
  '/parent-demo/action-bball-1.jpg',
];

// Faint background image behind the Dashboard athlete hero card.
export const DEMO_HERO_BG = '/parent-demo/action-bball-2.jpg';
