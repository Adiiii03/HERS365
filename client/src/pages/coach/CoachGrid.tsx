import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Trophy, Play } from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { isDemoCoach } from '../../components/coach/demoCoach';
import { demoHeadshot, demoFeed } from '../../components/coach/demoImages';
import { colors, type as t } from '../../lib/tokens';

// The Grid (coach) — ported from the parent Grid (pages/parent/ParentGrid.tsx) to match
// Valerie's "Coach Portal - THE GRID" mockup: hero + Your Athletes panel + athletes-on-the-grid
// switcher + Latest Drop cards. Spec: output/coach-portal-spec/the-grid.md.
//
// Display-only pass. There is NO coach grid-feed endpoint (GET /api/coach/grid-feed is the
// backend follow-up), so the athletes + Latest Drop feed are SAMPLE content rendered only for
// the demo coach (isDemoCoach), under clearly-visible "Sample data" badges. Real coaches get
// honest empty states. No writes, no realtime, no board-scoping this pass.

interface GridAthlete {
  id: number;
  name: string;
  position: string;
  jersey: string;
  city: string;
  score: number;
  online: boolean;
}

// Sample roster (no backing endpoint) — distinct demo names, flagged in the UI.
const SAMPLE_ATHLETES: GridAthlete[] = [
  { id: 1, name: 'Jasmine Carter', position: 'QB', jersey: '21', city: 'Dallas, TX', score: 98, online: true },
  { id: 2, name: 'Ava Bennett', position: 'WR', jersey: '5', city: 'Dallas, TX', score: 67, online: false },
];

const SAMPLE_DROPS = [
  { athlete: 'Jasmine Carter', meta: 'QB · Dallas, TX · 2m ago', score: 97, caption: '4 passing TDs in today’s 7v7. Let’s go!' },
  { athlete: 'Ava Bennett', meta: 'WR · Dallas, TX · 18m ago', score: 67, caption: "Film dropped from last Friday's game. DMs open" },
  { athlete: 'Jasmine Carter', meta: 'QB · Dallas, TX · 1h ago', score: 97, caption: 'Just got a new offer from Oregon. Grateful!' },
];

const SampleBadge = () => <Badge tone="neutral">Sample data</Badge>;

export const CoachGrid = () => {
  const demo = isDemoCoach();
  const athletes: GridAthlete[] = demo ? SAMPLE_ATHLETES : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero + Your Athletes panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <span
            className="inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em]"
            style={{ background: 'rgba(139,59,255,0.15)', border: '1px solid rgba(139,59,255,0.3)', color: colors.accent }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            The Feed · Live
          </span>
          <h2 className="mt-3 text-5xl sm:text-6xl lg:text-[5.5rem] font-[800] uppercase leading-[0.9] tracking-tight text-white" style={{ fontFamily: t.font.display }}>
            The <span style={{ color: colors.accent }}>Grid</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed max-w-2xl" style={{ color: colors.textSecondary }}>
            A glimpse of every rep, every offer, and every breakout moment from the athletes on the rise.
          </p>
        </div>

        {/* Your Athletes panel — sample for the demo coach; honest empty otherwise. */}
        <Card className="p-6 min-w-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={16} style={{ color: colors.accent }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>
                Your Athletes
              </span>
            </div>
            {demo && <SampleBadge />}
          </div>
          {athletes.length === 0 ? (
            <p className="text-sm" style={{ color: colors.textTertiary }}>
              No saved players yet. Use Player Search to start building your board.
            </p>
          ) : (
            <ul className="space-y-3">
              {athletes.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-6 shrink-0" style={{ color: colors.textTertiary }}>#{a.jersey}</span>
                  <span className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: colors.surface2 }}>
                    <img src={demoHeadshot(i)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{a.name}</p>
                    <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
                      {[a.position, a.city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-sm font-[800] px-2.5 py-1 rounded" style={{ fontFamily: t.font.display, color: colors.accent, background: 'rgba(139,59,255,0.12)' }}>
                    {a.score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Athletes on the Grid — switcher row */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
          <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: colors.accentText }}>
            Athletes on the Grid
          </h3>
        </div>
        <div className="flex items-center gap-5">
          <Link
            to="/coach/search"
            className="flex flex-col items-center gap-1.5"
            aria-label="Find players"
          >
            <span
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center border-2 border-dashed transition-colors hover:border-solid"
              style={{ borderColor: colors.borderStrong, color: colors.textTertiary }}
            >
              <Plus size={26} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textTertiary }}>Find</span>
          </Link>
          {athletes.map((a, i) => (
            <div key={a.id} className="flex flex-col items-center gap-1.5">
              <span className="relative">
                <span
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-sm font-black text-white overflow-hidden"
                  style={{ background: colors.surface2, border: `2px solid ${colors.accent}` }}
                >
                  <img src={demoHeadshot(i)} alt="" loading="lazy" className="w-full h-full object-cover" />
                </span>
                <span
                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2"
                  style={{ background: a.online ? '#22C55E' : '#9696A3', borderColor: colors.surface0 }}
                />
                <span
                  className="absolute -top-1 -right-1 text-[0.65rem] font-black px-1.5 py-0.5 rounded"
                  style={{ background: colors.accent, color: '#fff' }}
                >
                  {a.score}
                </span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.textPrimary }}>
                {a.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Drop feed — no feed endpoint; sample for the demo coach, honest empty otherwise. */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <h3 className="text-2xl font-[800] uppercase" style={{ fontFamily: t.font.display, color: colors.textPrimary }}>
            Latest Drop
          </h3>
          {demo && <SampleBadge />}
        </div>
        {!demo ? (
          <p className="text-sm py-6 text-center" style={{ color: colors.textTertiary }}>
            Drops from the players you save will appear here once the feed is connected.
          </p>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SAMPLE_DROPS.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: colors.surface2 }}>
                        <img src={demoHeadshot(i)} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate" style={{ fontFamily: t.font.display }}>{d.athlete}</p>
                        <p className="text-xs truncate" style={{ color: colors.textSecondary }}>{d.meta}</p>
                      </div>
                      <span className="text-sm font-[800] px-2.5 py-1 rounded" style={{ fontFamily: t.font.display, color: colors.accent, background: 'rgba(139,59,255,0.12)' }}>
                        {d.score}
                      </span>
                    </div>
                    <div className="relative mt-4 rounded-lg aspect-[288/140] overflow-hidden flex items-center justify-center" style={{ background: colors.surface2, border: `1px solid ${colors.border}` }}>
                      <img src={demoFeed(i)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: 'rgba(10,10,12,0.35)' }} />
                      <Play size={26} className="relative" style={{ color: '#fff' }} />
                    </div>
                    <p className="mt-4 text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{d.caption}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-xs" style={{ color: colors.textTertiary }}>
              This becomes a live feed of drops from the players you save once the feed is connected.
              Sample posts shown for now.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CoachGrid;
