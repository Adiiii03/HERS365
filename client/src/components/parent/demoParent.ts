// Single gate for "is this the designated demo parent account?" Only a demo
// account renders the parent portal's fabricated sample content (coach-contact
// requests, approval history, mockup metrics/feed). Every other parent — real or
// seeded — sees real data or honest empty states, so a real guardian never sees
// fabricated contact about a minor.
//
// Two demo personas, deliberately different in scope:
//
// - parent.maya@hers365.com: dev-only. The SERVER hard-blocks it in production
//   (DEMO_LOGIN_ALLOWLIST in server/authRoutes.ts), and we additionally fail closed
//   on any non-development build, so a leaked prod bundle can never render the sample
//   content even if the email matched.
//
// - rookie_parent@hers365.com: the LIVE demo account. It is NOT on the server's
//   demo-login allowlist, so it can sign in on the deployed site, and we intentionally
//   let it render the sample content in production so the team and external viewers can
//   see the full portal on the live URL. This is scoped to this single email: a real
//   guardian is always signed into their own account, so this can never surface
//   fabricated coach-contact content about a real minor. All of the content is mock,
//   and this runs on a demo deployment with no real users.

// Dev-only demo persona.
const DEV_DEMO_PARENT_EMAILS = new Set(['parent.maya@hers365.com']);

// Demo persona allowed to render in production builds too (live-site demo).
const PROD_DEMO_PARENT_EMAILS = new Set(['rookie_parent@hers365.com']);

export function isDemoParent(user: { email?: string | null } | null | undefined): boolean {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  // Live-site demo account: renders in any build, including production.
  if (PROD_DEMO_PARENT_EMAILS.has(email)) return true;
  // Everyone else: only the dev-only persona, and only in a dev build.
  // Vite sets MODE === 'development' only for `vite dev`; prod builds are 'production'.
  if (import.meta.env.MODE !== 'development') return false;
  return DEV_DEMO_PARENT_EMAILS.has(email);
}
