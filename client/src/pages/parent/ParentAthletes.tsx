import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Diamond, Plus, Play, GraduationCap, Building2, CalendarDays, ArrowRight, BarChart3 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Badge, EmptyState } from '../../components/ui';
import { InviteAthleteSheet } from '../../components/parent/InviteAthleteSheet';
import { athleteHeadshot, DEMO_FILM_HERO, DEMO_FILMS } from '../../components/parent/demoImages';
import { isDemoParent } from '../../components/parent/demoParent';
import { useAuth } from '../../context/AuthContext';
import { colors, type as t } from '../../lib/tokens';

// My Athletes (Valerie's P.P - MY ATHLETES). Spec: output/parent-portal-spec/my-athletes.md.
// Display-only pass. REAL: athlete identity + switcher (GET /api/parent/children) and the
// invite "+" (POST /api/parent/invite-athlete, via InviteAthleteSheet). Everything else on
// this page (decimal rating, quick-stat chips, films, stats grid, university interest,
// academics, schedule) has no parent endpoint yet, so it is rendered as clearly-flagged
// "Sample data" and never presented as real info about a minor. No writes this pass.

interface Child {
  id: number;
  name: string;
  position: string | null;
  school?: string | null;
  gradYear: number | null;
  age?: number | null;
  profileImage?: string;
  // Real fields from the widened GET /api/parent/children.
  stars?: number | null;
  breakoutScore?: number | null;
  offers?: number;
  gpa?: string | null;
  heightIn?: number | null;
  weightLbs?: number | null;
  profileCompleteness?: number;
}

// Shown when a parent has no linked children yet, so the demo layout still renders.
const DEFAULT_CHILD: Child = {
  id: 101,
  name: 'Maya Johnson',
  position: 'Point Guard',
  school: 'Lincoln High School',
  gradYear: 2027,
};

// --- Sample (no backing endpoint) content, mirrored from the mockup. Flagged in the UI. ---
const SAMPLE_CHIPS = [
  { label: 'CMP%', value: '67' },
  { label: 'GPA', value: '3.8' },
  { label: 'HGT', value: `5'9"` },
  { label: 'WGT', value: '130' },
];
const SAMPLE_RATING = 4.2;
const SAMPLE_FILMS = [
  { title: 'vs. Westlake Warriors', len: '08:42' },
  { title: '7v7 Summer Showcase', len: '14:10' },
  { title: 'State Semifinal', len: '06:55' },
  { title: 'Combine Testing Day', len: '09:21' },
];
const SAMPLE_STATS = [
  { label: 'PASS YDS', value: '1,842' }, { label: 'PASS TD', value: '24' },
  { label: 'CMP%', value: '67.3' }, { label: 'INT', value: '4' },
  { label: 'RUSH YDS', value: '512' }, { label: 'RUSH TD', value: '7' },
  { label: 'QBR', value: '94.1' }, { label: 'FLAGS PULLED', value: '38' },
];
const SAMPLE_INTEREST = [
  { school: 'University of Oregon', status: 'High Interest' },
  { school: 'Alabama', status: 'Offered' },
  { school: 'Ohio State', status: 'Watching' },
  { school: 'USC', status: 'High Interest' },
  { school: 'Texas', status: 'Watching' },
];
const SAMPLE_ACADEMICS = [
  { label: 'GPA', value: '3.8' }, { label: 'SAT', value: '1280' },
  { label: 'ACT', value: '28' }, { label: 'Class Rank', value: '12 / 305' },
  { label: 'Core GPA', value: '3.9' }, { label: 'NCAA Eligibility', value: 'Cleared' },
];
const SAMPLE_SCHEDULE = [
  { date: 'Oct 18', opp: 'vs. Westlake Warriors', loc: 'Home', time: '7:00 PM' },
  { date: 'Oct 22', opp: '@ Lincoln Lions', loc: 'Away', time: '6:30 PM' },
  { date: 'Oct 25', opp: 'vs. Riverside Prep', loc: 'Home', time: '7:30 PM' },
];

const SampleBadge = () => <Badge tone="neutral">Sample data</Badge>;

const SectionHeading = ({ children, sample = false }: { children: React.ReactNode; sample?: boolean }) => (
  <div className="flex items-center gap-2 mb-4">
    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>{children}</h3>
    {sample && <SampleBadge />}
  </div>
);

export const ParentAthletes = () => {
  const { user } = useAuth();
  // Demo account only: the mockup child + all the sample stats/film/academics/schedule.
  // Real parents see their real athlete's identity and honest "not connected yet" placeholders,
  // never fabricated stats/academics about a minor.
  const demo = isDemoParent(user);
  const [children, setChildren] = useState<Child[]>(demo ? [DEFAULT_CHILD] : []);
  const [activeChildId, setActiveChildId] = useState<number>(demo ? DEFAULT_CHILD.id : 0);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Load the real roster. Kept as a callback so the invite flow can refetch after
  // linking an athlete (event-driven, not in an effect).
  const fetchChildren = useCallback(async (): Promise<Child[] | null> => {
    const res = await apiFetch('/api/parent/children').catch(() => null);
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) return res.data as Child[];
    return null;
  }, []);

  const applyChildren = useCallback((roster: Child[] | null) => {
    if (roster && roster.length > 0) {
      setChildren(roster);
      setActiveChildId(roster[0].id);
    }
  }, []);

  // Canonical fetch-on-mount with an ignore flag so a late response after unmount
  // is dropped. setState here runs after an await (async), not synchronously.
  useEffect(() => {
    let ignore = false;
    fetchChildren().then(roster => { if (!ignore) applyChildren(roster); });
    return () => { ignore = true; };
  }, [fetchChildren, applyChildren]);

  const refetchChildren = useCallback(async () => {
    applyChildren(await fetchChildren());
  }, [fetchChildren, applyChildren]);

  const activeChild = children.find(c => c.id === activeChildId) || children[0];
  // Real diamond rating for non-demo (decimal HERS score, else the 1-5 stars).
  const realRating = activeChild ? (activeChild.breakoutScore ?? activeChild.stars ?? null) : null;
  // Real quick-stat chips for non-demo (only values that actually exist).
  const realChips = activeChild ? [
    { label: 'GPA', value: activeChild.gpa || '—' },
    { label: 'HGT', value: activeChild.heightIn != null ? `${Math.floor(activeChild.heightIn / 12)}'${activeChild.heightIn % 12}"` : '—' },
    { label: 'WGT', value: activeChild.weightLbs != null ? String(activeChild.weightLbs) : '—' },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Child switcher (real) */}
      <div className="flex items-center gap-4">
        {children.map(c => {
          const active = c.id === activeChildId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChildId(c.id)}
              className="flex flex-col items-center gap-1 group"
              aria-pressed={active}
            >
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white overflow-hidden"
                style={{
                  background: colors.surface2,
                  border: active ? `2px solid ${colors.accent}` : '2px solid transparent',
                  boxShadow: active ? '0 0 16px rgba(139,59,255,0.35)' : undefined,
                }}
              >
                <img src={c.profileImage || athleteHeadshot(c.name, c.id, demo)} alt="" className="w-full h-full object-cover" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: active ? colors.textPrimary : colors.textTertiary }}>
                {c.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex flex-col items-center gap-1"
          aria-label="Invite an athlete"
        >
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center border border-dashed transition-colors hover:border-solid"
            style={{ borderColor: colors.borderStrong, color: colors.textTertiary }}
          >
            <Plus size={18} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textTertiary }}>
            Add
          </span>
        </button>
      </div>

      {/* No linked athlete yet (non-demo): honest invite prompt instead of a fabricated child. */}
      {!activeChild && (
        <Card className="p-8 text-center">
          <p className="text-lg font-bold text-white">No athlete linked yet</p>
          <p className="mt-2 text-sm" style={{ color: colors.textTertiary }}>
            Invite your athlete with the Add button above to see their profile here.
          </p>
        </Card>
      )}

      {/* Hero: identity (real) + rating/chips (sample) */}
      {activeChild && (
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <span
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white overflow-hidden shrink-0"
            style={{ background: colors.surface2, border: `2px solid ${colors.accent}` }}
          >
            <img src={activeChild?.profileImage || athleteHeadshot(activeChild?.name, activeChild?.id ?? 0, demo)} alt="" className="w-full h-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-[800] uppercase leading-[0.95] text-white" style={{ fontFamily: t.font.display }}>
              {activeChild?.name}
            </h2>
            <p className="mt-2 text-sm font-bold uppercase tracking-wide" style={{ color: colors.accentText }}>
              {[activeChild?.position || 'Athlete', activeChild?.school, activeChild?.gradYear ? `Class of ${activeChild.gradYear}` : null]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
          {demo ? (
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Diamond key={i} size={13} style={{ color: colors.accent }} fill={i < Math.round(SAMPLE_RATING) ? colors.accent : 'transparent'} />
              ))}
            </div>
            <div className="mt-1 text-3xl font-[800] leading-none" style={{ fontFamily: t.font.display, color: colors.textPrimary }}>
              {SAMPLE_RATING.toFixed(1)}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Diamond Rating</span>
              <SampleBadge />
            </div>
          </div>
          ) : realRating != null ? (
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Diamond key={i} size={13} style={{ color: colors.accent }} fill={i < Math.round(realRating) ? colors.accent : 'transparent'} />
              ))}
            </div>
            <div className="mt-1 text-3xl font-[800] leading-none" style={{ fontFamily: t.font.display, color: colors.textPrimary }}>
              {realRating.toFixed(1)}
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Diamond Rating</div>
          </div>
          ) : (
          <div className="text-right shrink-0">
            <div className="text-xl font-[800] leading-none" style={{ fontFamily: t.font.display, color: colors.textSecondary }}>Not rated yet</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Diamond Rating</div>
          </div>
          )}
        </div>

        {/* Quick-stat chips: demo shows the sample set; real users see the values that exist. */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {(demo ? SAMPLE_CHIPS : realChips).map(ch => (
            <div key={ch.label} className="rounded-xl px-4 py-2" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
              <span className="text-lg font-[800]" style={{ fontFamily: t.font.display, color: colors.textPrimary }}>{ch.value}</span>
              <span className="ml-2 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>{ch.label}</span>
            </div>
          ))}
          {demo && <SampleBadge />}
        </div>
      </Card>
      )}

      {/* Detailed sections have no parent endpoint yet, so real users see each card with its
          own honest empty state (structure present, nothing fabricated). Academics surfaces
          the one real value we have (GPA). */}
      {!demo && activeChild && (<>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="p-6">
          <SectionHeading>Films / Highlights</SectionHeading>
          <EmptyState className="py-8" icon={<Play size={28} />} title="No film yet" body="Highlights will appear here once your athlete uploads film." />
        </Card>
        <Card className="p-6">
          <SectionHeading>Stats / Performance</SectionHeading>
          <EmptyState className="py-8" icon={<BarChart3 size={28} />} title="No stats yet" body="Verified season stats will appear here." />
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionHeading><span className="inline-flex items-center gap-2"><Building2 size={14} /> University Interest</span></SectionHeading>
          <EmptyState className="py-8" icon={<Building2 size={28} />} title="No interest yet" body="Schools showing interest will appear here." />
        </Card>
        <Card className="p-6">
          <SectionHeading><span className="inline-flex items-center gap-2"><GraduationCap size={14} /> Academic Profile</span></SectionHeading>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'GPA', value: activeChild.gpa || '—' },
              { label: 'SAT', value: '—' },
              { label: 'ACT', value: '—' },
              { label: 'Class Rank', value: '—' },
              { label: 'Core GPA', value: '—' },
              { label: 'NCAA Eligibility', value: '—' },
            ].map(a => (
              <div key={a.label} className="flex flex-col rounded-xl p-3" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
                <dt className="text-xs uppercase tracking-wider" style={{ color: colors.textTertiary }}>{a.label}</dt>
                <dd className="mt-0.5 font-bold text-white">{a.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <Card className="p-6">
        <SectionHeading><span className="inline-flex items-center gap-2"><CalendarDays size={14} /> Upcoming Schedule</span></SectionHeading>
        <EmptyState className="py-8" icon={<CalendarDays size={28} />} title="No games scheduled" body="Upcoming games will appear here." />
      </Card>
      </>)}

      {demo && (<>
      {/* Films + Stats */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="p-6">
          <SectionHeading sample>Films / Highlights</SectionHeading>
          <div
            className="relative rounded-xl overflow-hidden flex items-center justify-center aspect-video"
            style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}
          >
            <img src={DEMO_FILM_HERO} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.1), rgba(10,10,12,0.75))' }} />
            <span className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,59,255,0.35)' }}>
              <Play size={26} style={{ color: '#fff' }} fill="#fff" />
            </span>
            <span className="absolute bottom-3 left-3 text-xs font-semibold text-white/90">
              vs. Westlake Warriors · Semi Finals · 12:34
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SAMPLE_FILMS.map((f, i) => (
              <div key={f.title} className="rounded-lg p-2" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
                <div className="relative rounded-md aspect-video overflow-hidden flex items-center justify-center" style={{ background: colors.surface2 }}>
                  <img src={DEMO_FILMS[i % DEMO_FILMS.length]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  <Play size={16} className="relative" style={{ color: '#fff' }} />
                </div>
                <p className="mt-1.5 text-[0.7rem] font-semibold text-white truncate">{f.title}</p>
                <p className="text-xs" style={{ color: colors.textTertiary }}>{f.len}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading sample>Stats / Performance</SectionHeading>
          <p className="-mt-2 mb-4 text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Season 2025-26</p>
          <div className="grid grid-cols-2 gap-3">
            {SAMPLE_STATS.map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
                <div className="text-2xl font-[800] leading-none" style={{ fontFamily: t.font.display, color: colors.accent }}>{s.value}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* University Interest + Academics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionHeading sample><span className="inline-flex items-center gap-2"><Building2 size={14} /> University Interest</span></SectionHeading>
          <ul className="space-y-2">
            {SAMPLE_INTEREST.map(u => (
              <li key={u.school} className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.school}</p>
                  <p className="text-xs uppercase tracking-wider" style={{ color: colors.textTertiary }}>Flag Football</p>
                </div>
                <Badge tone={u.status === 'Offered' ? 'success' : 'neutral'} className="shrink-0">{u.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <SectionHeading sample><span className="inline-flex items-center gap-2"><GraduationCap size={14} /> Academic Profile</span></SectionHeading>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {SAMPLE_ACADEMICS.map(a => (
              <div key={a.label} className="flex flex-col rounded-xl p-3" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
                <dt className="text-xs uppercase tracking-wider" style={{ color: colors.textTertiary }}>{a.label}</dt>
                <dd className="mt-0.5 font-bold text-white">{a.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* Upcoming Schedule */}
      <Card className="p-6">
        <SectionHeading sample><span className="inline-flex items-center gap-2"><CalendarDays size={14} /> Upcoming Schedule</span></SectionHeading>
        <div className="divide-y divide-white/5">
          {SAMPLE_SCHEDULE.map((g, i) => (
            <motion.div
              key={`${g.date}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3 text-sm"
            >
              <span className="font-bold text-white w-14">{g.date}</span>
              <span className="truncate text-white/90">{g.opp}</span>
              <Badge tone="neutral" className="shrink-0">{g.loc}</Badge>
              <span className="shrink-0 tabular-nums" style={{ color: colors.textTertiary }}>{g.time}</span>
            </motion.div>
          ))}
        </div>
        <button type="button" className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider" style={{ color: colors.accent }} disabled title="Full season view is not wired yet">
          View Full Season <ArrowRight size={14} />
        </button>
      </Card>
      </>)}

      <InviteAthleteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={refetchChildren} />
    </div>
  );
};

export default ParentAthletes;
