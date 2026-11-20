// Demo-only placeholder imagery for the coach portal, served from public/coach-demo.
// These are basketball/stock filler (Valerie-convention placeholders, NOT flag football
// and NOT real athletes) that fill avatars + "Latest Drop" thumbnails on The Grid so the
// demo doesn't show bare initials while the real feed/media layer isn't wired. Scoped to
// the coach portal, gated behind isDemoCoach, never written to the DB. Swap/remove freely.

export const COACH_DEMO_PHOTOS = [
  '/coach-demo/athlete-1.jpg',
  '/coach-demo/athlete-2.jpg',
  '/coach-demo/athlete-3.jpg',
  '/coach-demo/athlete-4.jpg',
  '/coach-demo/athlete-5.jpg',
  '/coach-demo/athlete-6.jpg',
  '/coach-demo/athlete-7.jpg',
  '/coach-demo/athlete-8.jpg',
];

// Deterministic round-avatar headshot, keyed by a stable value (index or id) so the
// same athlete always gets the same face.
export function demoHeadshot(key: number): string {
  return COACH_DEMO_PHOTOS[Math.abs(Math.trunc(key)) % COACH_DEMO_PHOTOS.length];
}

// Wide thumbnail for a "Latest Drop" card, offset from the headshots so a card's avatar
// and its film thumbnail aren't the same photo.
export function demoFeed(i: number): string {
  return COACH_DEMO_PHOTOS[(Math.abs(Math.trunc(i)) + 4) % COACH_DEMO_PHOTOS.length];
}

// Flag-football action banners for the Scouting Board prospect cards (landscape ~2:1).
// On-brand flag football (not basketball), but still placeholder portraits of non-real
// athletes — only ever shown for the demo coach, never painted onto a real athlete.
export const COACH_SCOUTING_PHOTOS = [
  '/coach-demo/scouting/athlete-1.jpg',
  '/coach-demo/scouting/athlete-2.jpg',
  '/coach-demo/scouting/athlete-3.jpg',
  '/coach-demo/scouting/athlete-4.jpg',
  '/coach-demo/scouting/athlete-5.jpg',
  '/coach-demo/scouting/athlete-6.jpg',
  '/coach-demo/scouting/athlete-7.jpg',
  '/coach-demo/scouting/athlete-8.jpg',
];

// Deterministic scouting-board banner, keyed by a stable value (player id) so an
// athlete always gets the same portrait across renders.
export function scoutingPhoto(key: number): string {
  return COACH_SCOUTING_PHOTOS[Math.abs(Math.trunc(key)) % COACH_SCOUTING_PHOTOS.length];
}

// Player Search card film strip. Uses the same flag-football banner pool as the Scouting
// Board, keyed by athlete id — so an athlete shows the SAME banner on Search and the board
// (cross-page consistency). Flag football, non-real athletes, demo-gated.
export function searchPhoto(key: number): string {
  return COACH_SCOUTING_PHOTOS[Math.abs(Math.trunc(key)) % COACH_SCOUTING_PHOTOS.length];
}

// Overlapping circular profile picture on the Player Search cards (Valerie's design).
// Only the three athletes she actually drew cards for overlap the seeded roster by name
// (Aaliyah Brooks, Maya Thompson, Sofia Martinez), so we use her three actual card headshots
// for them. These are her card portraits re-dropped in raw/ (Wildcats jerseys / stock). Every
// other athlete returns null → the card shows an initials circle instead of a reused face
// (reusing 3 faces across 6 named cards would land the same face on two different names).
const DEMO_HEADSHOTS: Array<[RegExp, string]> = [
  [/brooks/i, '/coach-demo/headshots/brooks.jpg'],
  [/maya/i, '/coach-demo/headshots/maya.jpg'],
  [/martinez/i, '/coach-demo/headshots/martinez.jpg'],
];

export function demoAvatar(name: string): string | null {
  const hit = DEMO_HEADSHOTS.find(([re]) => re.test(name || ''));
  return hit ? hit[1] : null;
}
