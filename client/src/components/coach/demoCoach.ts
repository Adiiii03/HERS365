// Single gate for "is this the designated demo coach account?" Only the demo coach
// renders the coach portal's fabricated sample content (The Grid sample athletes +
// drops). Every other coach — real or seeded — sees honest empty states, so a real
// coach never sees invented athlete activity.
//
// Mirrors isDemoParent (components/parent/demoParent): coach@hers365.com is the demo
// persona ("Coach Sarah Williams"). We fail closed on any non-development build so a
// leaked prod bundle can never render the sample content even if the email matched.
// NOTE: the coach portal stores its identity in localStorage.coachUser (not AuthContext).

const DEMO_COACH_EMAILS = new Set(['coach@hers365.com']);

export function isDemoCoach(): boolean {
  // Vite sets MODE === 'development' only for `vite dev`; prod builds are 'production'.
  if (import.meta.env.MODE !== 'development') return false;
  try {
    const u = JSON.parse(localStorage.getItem('coachUser') || '{}');
    const email = typeof u?.email === 'string' ? u.email.toLowerCase() : '';
    return !!email && DEMO_COACH_EMAILS.has(email);
  } catch {
    return false;
  }
}
