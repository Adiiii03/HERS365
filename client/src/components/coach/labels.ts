// Human-readable expansions for coach-facing cards. Jesus wants athlete identity written out
// in full (position, state, high school) instead of the abbreviated data values. Pure string
// helpers, no data mutation; unknown inputs fall back to the raw value so nothing ever blanks.

// Flag-football positions (the seeded roster uses QB/WR/RB/CB/S/ATH; a few extras for safety).
const POSITION_NAMES: Record<string, string> = {
  QB: 'Quarterback',
  WR: 'Wide Receiver',
  RB: 'Running Back',
  CB: 'Cornerback',
  S: 'Safety',
  ATH: 'Athlete',
  TE: 'Tight End',
  LB: 'Linebacker',
  C: 'Center',
  RUSHER: 'Rusher',
  BLITZER: 'Blitzer',
};

export function fullPosition(pos: string | null | undefined): string {
  if (!pos) return '';
  return POSITION_NAMES[pos.trim().toUpperCase()] ?? pos;
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington, D.C.',
};

export function fullStateName(abbr: string | null | undefined): string {
  if (!abbr) return '';
  return STATE_NAMES[abbr.trim().toUpperCase()] ?? abbr;
}

// Spell out a trailing "HS" as "High School" (e.g. "Westlake HS" -> "Westlake High School").
export function expandSchool(school: string | null | undefined): string {
  if (!school) return '';
  return school.replace(/\bHS\b\.?$/i, 'High School').trim();
}
