import { forwardRef, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../lib/tokens';
import { springs } from '../lib/motion';

const { colors, type: T, radii } = tokens;

// ─── Types ─────────────────────────────────────────────────────────────────
// Mirrors the server's GET /api/rankings/me response. Three shapes only —
// anything else is treated as "render nothing" by the parent.
export type RankMeRanked = {
  ranked: true;
  rank: number;
  total: number;
  rating: number;
  position: string;
};
export type RankMeUnratedOrHidden = {
  ranked: false;
  reason: 'unrated' | 'hidden';
};

interface CommonProps {
  /** True once the show-class has been added (drives the slide-in). */
  inView: boolean;
  /** True when the athlete's real row is on screen — tuck out, don't fully retreat. */
  tucked: boolean;
}

interface RankedProps extends CommonProps {
  data: RankMeRanked;
  athleteId: number;
  athleteName: string;
  athleteSchool: string;
}

// One-time-per-mount count-up. Reduced-motion lands on the target instantly.
function useCountUp(target: number, { durationMs = 900 }: { durationMs?: number } = {}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (reduce) {
      setValue(targetRef.current);
      return;
    }
    const end = targetRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(end * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

// ─── The ranked variant — the centerpiece ──────────────────────────────────
// Whole strip is one button → her profile. One scalpel of accent (the rating
// number); everything else holds composition. Signature moment #1: the rank
// counts up once on first render and settles on a spring.
export const YourRankDock = forwardRef<HTMLButtonElement, RankedProps>(function YourRankDock(
  { data, athleteId, athleteName, athleteSchool, inView, tucked },
  ref,
) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { rank, rating, position } = data;
  const rankDisplay = useCountUp(rank, { durationMs: 900 });

  return (
    <div
      className={`rk-dock${inView ? ' rk-dock--in' : ''}${tucked ? ' rk-dock--tucked' : ''}`}
      aria-hidden={!inView}
    >
      <button
        ref={ref}
        type="button"
        onClick={() => navigate(`/profile/${athleteId}`)}
        aria-label={`Your ranking: number ${rank}, rating ${rating}. View your profile.`}
        className="rk-dock-surface"
        style={{
          width: '100%',
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 20px',
          background: 'rgba(18,18,22,0.92)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderTop: `2px solid ${colors.accent}`,
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          boxShadow: '0 -1px 0 rgba(139,59,255,0.40), 0 -16px 40px -12px rgba(139,59,255,0.22)',
          color: colors.textPrimary,
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: T.font.body,
          transition: 'transform 100ms ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.995)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = '')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
      >
        {/* YOU pill */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.accent,
            color: colors.surface0,
            fontFamily: T.font.body,
            fontWeight: T.weight.bold,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '4px 9px',
            borderRadius: radii.sm,
            flexShrink: 0,
          }}
        >
          You
        </span>

        {/* Rank — signature reveal: count-up + spring settle */}
        <motion.span
          className="tnum"
          initial={reduce ? false : { scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.snappy}
          style={{
            fontFamily: T.font.display,
            fontWeight: T.weight.bold + 100,
            fontSize: 'clamp(28px, 5.5vw, 34px)',
            lineHeight: 1,
            color: colors.accentText,
            letterSpacing: '-0.01em',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'baseline',
          }}
          aria-hidden="true"
        >
          <span style={{ fontSize: '0.6em', color: 'rgba(139,59,255,0.55)', marginRight: 1 }}>#</span>
          {rankDisplay}
        </motion.span>

        {/* Name + school */}
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            style={{
              fontFamily: T.font.body,
              fontWeight: T.weight.semibold,
              fontSize: 16,
              color: colors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {athleteName}
          </span>
          {athleteSchool && (
            <span
              className="rk-dock-school"
              style={{
                fontFamily: T.font.body,
                fontWeight: T.weight.regular,
                fontSize: 12,
                color: colors.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}
            >
              {athleteSchool}
            </span>
          )}
        </span>

        {/* Position chip — hidden on very narrow screens via wrapper class.
            420px breakpoint is handled inline. */}
        {position && position !== '–' && (
          <span
            className="rk-dock-pos"
            style={{
              fontFamily: T.font.body,
              fontWeight: T.weight.semibold,
              fontSize: 12,
              letterSpacing: '0.04em',
              color: colors.textSecondary,
              background: colors.surface2,
              padding: '5px 10px',
              borderRadius: radii.sm,
              flexShrink: 0,
            }}
          >
            {position}
          </span>
        )}

        {/* Rating — loudest number */}
        <span
          className="tnum"
          style={{
            fontFamily: T.font.display,
            fontWeight: T.weight.bold + 100,
            fontSize: 'clamp(32px, 6vw, 38px)',
            lineHeight: 1,
            color: colors.accent,
            letterSpacing: '-0.01em',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {rating}
        </span>

        {/* Chevron */}
        <ChevronRight size={20} color="rgba(244,244,245,0.45)" style={{ flexShrink: 0 }} />
      </button>
    </div>
  );
});

// ─── The unrated / hidden variant ─────────────────────────────────────────
// Same dock slot, muted border + softer shadow. Copy is taken from the spec
// verbatim. CTA targets are real existing routes — /profile for unrated
// (see what to improve), /settings for hidden (manage visibility).
interface UnratedOrHiddenProps extends CommonProps {
  data: RankMeUnratedOrHidden;
}

export function YourRankDockEmpty({ data, inView, tucked }: UnratedOrHiddenProps) {
  const navigate = useNavigate();
  const onCta = () => {
    if (data.reason === 'unrated') navigate('/profile');
    else navigate('/settings');
  };
  const ctaLabel = data.reason === 'unrated' ? 'See what counts ›' : 'Manage visibility ›';
  const message =
    data.reason === 'unrated'
      ? "You're on the board soon — keep your profile sharp."
      : 'Your ranking is private — only you can see this.';
  const subline =
    data.reason === 'hidden' ? 'A parent or guardian set your board to hidden.' : null;

  return (
    <div
      className={`rk-dock${inView ? ' rk-dock--in' : ''}${tucked ? ' rk-dock--tucked' : ''}`}
      aria-hidden={!inView}
    >
      <div
        className="rk-dock-surface"
        style={{
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 20px',
          background: 'rgba(18,18,22,0.92)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderTop: '2px solid rgba(139,59,255,0.35)',
          boxShadow: '0 -1px 0 rgba(139,59,255,0.18), 0 -10px 28px -10px rgba(139,59,255,0.12)',
          color: colors.textPrimary,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.accent,
            color: colors.surface0,
            fontFamily: T.font.body,
            fontWeight: T.weight.bold,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '4px 9px',
            borderRadius: radii.sm,
            flexShrink: 0,
          }}
        >
          You
        </span>

        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: T.font.body,
              fontWeight: T.weight.medium,
              fontSize: 14,
              color: colors.textSecondary,
            }}
          >
            {message}
          </span>
          {subline && (
            <span
              className="rk-dock-subline"
              style={{
                fontFamily: T.font.body,
                fontWeight: T.weight.regular,
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {subline}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onCta}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.accentText,
            fontFamily: T.font.body,
            fontWeight: T.weight.semibold,
            fontSize: 13,
            cursor: 'pointer',
            padding: '8px 4px',
            flexShrink: 0,
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
