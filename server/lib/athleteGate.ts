export type AthleteGateResult =
  | { ok: true; dob: Date }
  | { ok: false; error: string };

// Server is the source of truth for the athlete age gate:
// COPPA (under 13 cannot self-register) and the under-18 parent gate.
export function validateAthleteSignup(dobInput: unknown, parentEmail: unknown): AthleteGateResult {
  if (!dobInput) return { ok: false, error: 'Date of birth is required for athlete accounts' };
  const dob = new Date(dobInput as string);
  if (Number.isNaN(dob.getTime())) return { ok: false, error: 'Invalid date of birth' };
  const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYears < 13) {
    return { ok: false, error: 'Users under 13 cannot create their own account. Ask a parent to set up a managed account.' };
  }
  const pe = typeof parentEmail === 'string' ? parentEmail.trim() : '';
  if (ageYears < 18 && !pe) {
    return { ok: false, error: 'A parent or guardian email is required for athletes under 18.' };
  }
  return { ok: true, dob };
}
