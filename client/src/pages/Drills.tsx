import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Target, Clock, ChevronRight, Play, CheckCircle2,
  RotateCcw, Flame, TrendingUp, Award,
} from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';
import { Badge, Button } from '../components/ui';

const DISP = t.font.display;

type Drill = {
  id: number;
  name: string;
  category: 'Speed' | 'Agility' | 'Route Running' | 'Defense' | 'Strength';
  duration: string;
  reps: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
  desc: string;
  cues: string[];
  completed: boolean;
};

const DRILLS: Drill[] = [
  {
    id: 1, name: '10-Yard Burst', category: 'Speed', duration: '20 min', reps: '8 × 10 yds',
    difficulty: 'Beginner',
    desc: 'Explosive first-step acceleration off the line. Focus on drive angle and arm mechanics.',
    cues: ['Low start, 45° lean', 'Drive knees high first 5 yards', 'Full arm swing — pump harder', 'Eyes up at 7 yards'],
    completed: false,
  },
  {
    id: 2, name: '5-10-5 Shuttle', category: 'Agility', duration: '25 min', reps: '6 reps',
    difficulty: 'Intermediate',
    desc: 'The pro agility test. Five yards each direction — measures lateral change of direction.',
    cues: ['Touch the line, don\'t reach', 'Crossover step at first cut', 'Stay low through the plant', 'Accelerate through finish'],
    completed: false,
  },
  {
    id: 3, name: 'In-Out Routes', category: 'Route Running', duration: '30 min', reps: '10 reps each',
    difficulty: 'Intermediate',
    desc: 'Crisp inside/outside releases off the line. Sell the go route before breaking.',
    cues: ['Stack the DB with head fake', 'Break at full speed — don\'t slow down', 'Hands ready before the break', 'Look the ball in through contact'],
    completed: false,
  },
  {
    id: 4, name: 'Defensive Back Hip Flip', category: 'Defense', duration: '20 min', reps: '12 reps',
    difficulty: 'Advanced',
    desc: 'Turn your hips fluidly to run with a receiver after pressing at the line.',
    cues: ['Press with outside arm up', 'Flip hips before the receiver does', 'Mirror the release, stay square', 'Eyes on the hip, not the head'],
    completed: false,
  },
  {
    id: 5, name: 'Single-Leg Box Jump', category: 'Strength', duration: '15 min', reps: '3 × 8 each leg',
    difficulty: 'Advanced',
    desc: 'Build unilateral power and landing stability for cutting and jumping.',
    cues: ['Swing opposite arm on takeoff', 'Stick the landing — no wobble', 'Soft knees, absorb on the way down', 'Rest 90s between sets'],
    completed: false,
  },
  {
    id: 6, name: 'Cone Weave Acceleration', category: 'Agility', duration: '25 min', reps: '5 sets',
    difficulty: 'Elite',
    desc: 'High-speed cone weave at 75% then 100%. Develops open-field agility at game speed.',
    cues: ['Lean away from the cone', 'Don\'t chop — long strides between cones', 'Eyes ahead two cones', 'Breathe out on every other cut'],
    completed: false,
  },
];

const CATEGORIES = ['All', 'Speed', 'Agility', 'Route Running', 'Defense', 'Strength'] as const;
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Elite'] as const;
const DIFF_TONE: Record<string, 'success' | 'neutral' | 'accent' | 'pink'> = {
  Beginner: 'success', Intermediate: 'neutral', Advanced: 'accent', Elite: 'pink',
};
const DIFF_CHIP_COLOR: Record<string, string> = {
  Beginner: colors.success, Intermediate: colors.textSecondary,
  Advanced: colors.accent, Elite: colors.pink,
};

function DrillCard({ drill, onClick }: { drill: Drill; onClick: () => void }) {
  const catIcons: Record<string, React.ReactNode> = {
    Speed: <Zap size={14} />, Agility: <RotateCcw size={14} />,
    'Route Running': <Target size={14} />, Defense: <Flame size={14} />,
    Strength: <TrendingUp size={14} />,
  };

  return (
    <motion.div
      className="k-card-hover"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{ padding: '16px 18px', cursor: 'pointer', marginBottom: 10 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: radii.md, flexShrink: 0,
          background: drill.completed ? `${colors.accent}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${drill.completed ? `${colors.accent}40` : colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: drill.completed ? colors.accent : colors.textSecondary,
          transition: 'all 0.2s',
        }}>
          {drill.completed
            ? <CheckCircle2 size={20} />
            : catIcons[drill.category]}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold,
              textTransform: 'uppercase', letterSpacing: '-0.01em', color: colors.textPrimary,
            }}>
              {drill.name}
            </span>
            {drill.completed && (
              <span style={{ fontSize: t.size.xs, color: colors.success, fontWeight: t.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Done
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <Badge tone={DIFF_TONE[drill.difficulty]}>{drill.difficulty}</Badge>
            <span style={{ fontSize: t.size.xs, color: colors.textTertiary, fontWeight: t.weight.semibold, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {drill.category}
            </span>
          </div>
          <p style={{ fontSize: t.size.base, color: colors.textSecondary, margin: 0, lineHeight: 1.45 }}>
            {drill.desc}
          </p>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.textTertiary }}>
            <Clock size={11} />
            <span style={{ fontSize: t.size.xs, fontWeight: t.weight.semibold }}>{drill.duration}</span>
          </div>
          <div style={{ fontSize: t.size.xs, color: colors.textTertiary, fontWeight: t.weight.semibold }}>{drill.reps}</div>
          <div style={{ color: colors.accent, display: 'flex', alignItems: 'center', gap: 3 }}>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DrillDetail({ drill, onClose, onComplete }: {
  drill: Drill; onClose: () => void; onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
        zIndex: 50, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600, margin: '0 auto',
          background: colors.surface1, borderRadius: '20px 20px 0 0',
          border: `1px solid ${colors.border}`, borderBottom: 'none',
          padding: '28px 28px 40px',
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: radii.full, margin: '0 auto 24px' }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontFamily: DISP, fontSize: t.size['2xl'], fontWeight: t.weight.bold, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.01em' }}>
            {drill.name}
          </h2>
          {drill.completed && <CheckCircle2 size={20} color={colors.success} />}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Badge tone={DIFF_TONE[drill.difficulty]}>{drill.difficulty}</Badge>
          <span style={{ fontSize: t.size.xs, color: colors.textTertiary, fontWeight: t.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'center' }}>
            {drill.category}
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { icon: <Clock size={14} />, label: 'Duration', val: drill.duration },
            { icon: <RotateCcw size={14} />, label: 'Volume', val: drill.reps },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`,
              borderRadius: radii.sm, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.textTertiary, marginBottom: 4 }}>
                {s.icon}
                <span style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {s.label}
                </span>
              </div>
              <div style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold, letterSpacing: '-0.01em', color: colors.textPrimary }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        <p style={{ fontSize: t.size.md, color: colors.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
          {drill.desc}
        </p>

        {/* Coaching cues */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14,
          }}>
            Coaching Cues
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {drill.cues.map((cue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 28 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 14px', borderRadius: radii.sm,
                  background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `${colors.accent}18`, border: `1px solid ${colors.accent}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: DISP, fontSize: t.size.base, fontWeight: t.weight.bold, color: colors.accent,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: t.size.md, color: colors.textSecondary, lineHeight: 1.45 }}>
                  {cue}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12 }}>
          {drill.completed ? (
            <Button
              variant="ghost"
              size="lg"
              className="flex-1"
              style={{
                background: `${colors.success}1f`,
                border: `1px solid ${colors.success}40`,
                color: colors.success,
                fontFamily: DISP, textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'default',
              }}
            >
              <CheckCircle2 size={17} /> Completed
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1"
              onClick={onComplete}
              style={{ fontFamily: DISP, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              <Play size={17} /> Start Drill
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export const Drills = () => {
  const [drills, setDrills] = useState<Drill[]>(DRILLS);
  const [catFilter, setCatFilter] = useState<string>('All');
  const [diffFilter, setDiffFilter] = useState<string>('All');
  const [selected, setSelected] = useState<Drill | null>(null);

  const completedCount = drills.filter((d) => d.completed).length;
  const streakXP = completedCount * 50;

  const filtered = drills.filter((d) => {
    if (catFilter !== 'All' && d.category !== catFilter) return false;
    if (diffFilter !== 'All' && d.difficulty !== diffFilter) return false;
    return true;
  });

  const markComplete = (id: number) => {
    setDrills((prev) => prev.map((d) => d.id === id ? { ...d, completed: true } : d));
    setSelected((prev) => prev && prev.id === id ? { ...prev, completed: true } : prev);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 120px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
          fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: colors.accent,
        }}>
          <Flame size={13} />
          TRAINING DRILLS
        </div>
        <h1 style={{
          fontFamily: DISP, fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: t.weight.bold,
          textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px',
          lineHeight: 1,
        }}>
          Get To Work.
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.md, margin: 0, lineHeight: 1.5 }}>
          Position-specific drills built for girls flag football. Every rep tracked.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        background: colors.surface1, border: `1px solid ${colors.border}`,
        borderRadius: radii.md, padding: '16px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: radii.md,
          background: completedCount > 0 ? `${colors.accent}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${completedCount > 0 ? `${colors.accent}40` : colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Award size={20} color={completedCount > 0 ? colors.accent : colors.textSecondary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: t.size.base, fontWeight: t.weight.bold, color: colors.textPrimary }}>
              Today's Progress
            </span>
            <span style={{ fontSize: t.size.base, color: colors.accent, fontWeight: t.weight.bold }}>
              {completedCount} / {drills.length} drills · {streakXP} XP
            </span>
          </div>
          <div className="k-progress-track">
            <motion.div
              className="k-progress-fill"
              animate={{ width: `${(completedCount / drills.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
        {CATEGORIES.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.94 }}
            onClick={() => setCatFilter(c)}
            style={{
              padding: '6px 14px', borderRadius: radii.pill, border: 'none',
              background: catFilter === c ? colors.accent : 'rgba(255,255,255,0.05)',
              color: catFilter === c ? colors.accentOn : colors.textSecondary,
              fontSize: t.size.sm, fontWeight: t.weight.bold, letterSpacing: '0.04em',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {c}
          </motion.button>
        ))}
      </div>

      {/* Difficulty filter */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {DIFFICULTIES.map((d) => (
          <motion.button
            key={d}
            whileTap={{ scale: 0.94 }}
            onClick={() => setDiffFilter(d)}
            style={{
              padding: '5px 12px', borderRadius: radii.pill, border: 'none',
              background: diffFilter === d ? (DIFF_CHIP_COLOR[d] || colors.accent) : 'rgba(255,255,255,0.04)',
              color: diffFilter === d ? colors.surface0 : colors.textTertiary,
              fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.05em',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {d === 'All' ? 'All Levels' : d}
          </motion.button>
        ))}
      </div>

      {/* Drill list */}
      <div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textTertiary }}>
            <Target size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: t.size.md, margin: 0 }}>No drills match those filters.</p>
          </div>
        ) : (
          filtered.map((drill) => (
            <DrillCard key={drill.id} drill={drill} onClick={() => setSelected(drill)} />
          ))
        )}
      </div>

      {/* Drill detail sheet */}
      <AnimatePresence>
        {selected && (
          <DrillDetail
            drill={selected}
            onClose={() => setSelected(null)}
            onComplete={() => {
              markComplete(selected.id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
