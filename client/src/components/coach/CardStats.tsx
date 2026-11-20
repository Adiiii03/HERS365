// Shared coach-card bits: the HERS G5 Diamond rating and the stat boxes. Self-contained with
// inline token styles so both the Tailwind-styled Player Search page and the token-styled
// Scouting Board page can drop them in and look identical.
import { Diamond } from 'lucide-react';
import { colors } from '../../lib/tokens';

// HERS G5 Diamond Ranking. `rating` is the athlete's real integer g5Rating (1-5) → that many
// filled purple diamonds out of 5. We intentionally show the integer, not an invented decimal:
// the full five-part G5 score (Athleticism, Skill Mastery, Game IQ, Leadership, Results) is a
// planned HERS computation, not something the coach endpoints return yet.
export function DiamondRating({ rating, showLabel = true }: { rating: number; showLabel?: boolean }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textSecondary }}>
          HERS Rating
        </span>
      )}
      <div className="flex items-center gap-0.5" role="img" aria-label={`${filled} of 5 diamonds`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Diamond
            key={i}
            className="w-4 h-4"
            style={{
              color: i < filled ? colors.accent : colors.border,
              fill: i < filled ? colors.accent : 'none',
            }}
          />
        ))}
      </div>
      <span className="text-sm font-bold" style={{ color: colors.accentText }}>{filled}</span>
    </div>
  );
}

// A null/empty value renders an honest "Not measured" (the platform has no measured
// value for this athlete). `projected` marks demo-only sample data: when true and a
// value is present it mutes + prefixes a tilde. Real coaches pass projected=false, so a
// present value is real and shown plain; a missing one reads "Not measured".
function StatBox({ label, value, projected = false }: { label: string; value: string | null; projected?: boolean }) {
  const hasValue = value != null && value !== '' && value !== '—';
  const display = !hasValue ? 'Not measured' : (projected ? `~${value}` : value);
  const color = !hasValue ? colors.textTertiary : (projected ? colors.textSecondary : colors.accentText);
  return (
    <div
      className="flex-1 rounded-lg px-2 py-2 text-center"
      style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}
      title={
        !hasValue ? 'Not measured — no measured value for this athlete yet'
          : projected ? 'Projected sample value, not measured' : undefined
      }
    >
      <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: colors.textTertiary }}>
        {label}
      </div>
      <div
        className={hasValue ? 'text-lg font-bold leading-tight' : 'text-[11px] font-medium leading-tight py-1'}
        style={{ color }}
        aria-label={
          !hasValue ? `${label} not measured`
            : projected ? `${label} ${value}, projected sample, not measured` : undefined
        }
      >
        {display}
      </div>
    </div>
  );
}

// Three stat boxes: GPA + Height + Weight. GPA is real; HGT/WGT are real for real coaches
// (null → "Not measured") and fabricated sample for the demo coach. `projected` is driven by
// isDemoCoach() at the call site, so ONLY the demo credential sees the tilde/sample; real
// coaches never see an invented measurement (the server sends null for unmeasured fields).
// No "FT" box — flag football has no free-throw stat.
export function StatBoxes({ gpa, height, weight, projected = false }: { gpa: number | null; height: string | null; weight: number | null; projected?: boolean }) {
  const hgt = height && height !== '—' ? height : null;
  const wgt = weight != null ? String(weight) : null;
  const showLegend = projected && (hgt != null || wgt != null);
  return (
    <div>
      <div className="flex items-stretch gap-2">
        <StatBox label="GPA" value={gpa != null ? Number(gpa).toFixed(1) : null} />
        <StatBox label="HGT" value={hgt} projected={projected} />
        <StatBox label="WGT" value={wgt} projected={projected} />
      </div>
      {showLegend && (
        <div className="mt-1 text-[10px]" style={{ color: colors.textTertiary }}>
          ~ projected sample, not measured
        </div>
      )}
    </div>
  );
}
