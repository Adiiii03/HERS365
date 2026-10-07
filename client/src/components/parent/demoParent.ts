// Single gate for "is this the designated demo parent account?" Only the demo
// account renders the parent portal's fabricated sample content (coach-contact
// requests, approval history, mockup metrics/feed). Every other parent — real or
// seeded — sees real data or honest empty states, so a real guardian never sees
// fabricated contact about a minor.
//
// parent.maya is the demo persona: it's a seeded fixture that the SERVER already
// hard-blocks in production (DEMO_LOGIN_ALLOWLIST in server/authRoutes.ts), and it
// carries the mockup-faithful polish (real headshot, Westlake HS, etc.). We mirror
// that allowlist here and additionally fail closed on any non-development build, so
// a leaked prod bundle can never render the sample content even if the email matched.

const DEMO_PARENT_EMAILS = new Set(['parent.maya@hers365.com']);

export function isDemoParent(user: { email?: string | null } | null | undefined): boolean {
  // Vite sets MODE === 'development' only for `vite dev`; prod builds are 'production'.
  if (import.meta.env.MODE !== 'development') return false;
  const email = user?.email?.toLowerCase();
  return !!email && DEMO_PARENT_EMAILS.has(email);
}
