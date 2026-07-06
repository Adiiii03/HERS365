import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Users, CheckCircle2, Zap, MessageCircle,
} from 'lucide-react';
import { athleteAvatar } from '../lib/avatar';
import { colors, type as t, radii } from '../lib/tokens';
import { Chip, Input, Button } from '../components/ui';

const DISP = t.font.display;

type Athlete = {
  id: number; name: string; school: string; state: string; pos: string;
  gradYear: number; g5Rating: number; verified: boolean; bio: string;
  lookingFor: 'team' | '7v7' | 'training partner' | 'all'; connected: boolean;
};

interface SquadApiRow {
  id: number;
  name?: string;
  school?: string;
  state?: string;
  position?: string;
  gradYear?: number;
  g5Rating?: number;
  subscriptionTier?: string;
  bio?: string;
}

const SEED_ATHLETES: Athlete[] = [
  { id: 1, name: 'Destiny Clarke', school: 'Houston HS, TX', state: 'TX', pos: 'QB', gradYear: 2026, g5Rating: 91, verified: true, bio: 'Looking for a 7v7 squad that trains hard. QB who can run and throw.', lookingFor: '7v7', connected: false },
  { id: 2, name: 'Priya Patel', school: 'Edison HS, NJ', state: 'NJ', pos: 'DB', gradYear: 2027, g5Rating: 87, verified: true, bio: 'Elite shutdown corner. Want a serious training partner who pushes me.', lookingFor: 'training partner', connected: false },
  { id: 3, name: 'Naomi Carter', school: 'Brookfield HS, NC', state: 'NC', pos: 'WR', gradYear: 2026, g5Rating: 84, verified: true, bio: "Route running is my art. Looking for a competitive team heading into spring.", lookingFor: 'team', connected: false },
  { id: 4, name: 'Layla Hassan', school: 'Crestview HS, AZ', state: 'AZ', pos: 'LB', gradYear: 2028, g5Rating: 83, verified: false, bio: "Physical LB who loves contact. 7v7 or team — I'm in.", lookingFor: 'all', connected: false },
  { id: 5, name: 'Sofia Ramirez', school: 'Desert Ridge HS, AZ', state: 'AZ', pos: 'RB', gradYear: 2026, g5Rating: 89, verified: true, bio: 'Speed back looking for 7v7 reps before the fall season.', lookingFor: '7v7', connected: false },
  { id: 6, name: 'Amara Osei', school: 'Westwood HS, FL', state: 'FL', pos: 'TE', gradYear: 2027, g5Rating: 86, verified: false, bio: 'Versatile TE who can split out wide. Serious about getting recruited.', lookingFor: 'team', connected: false },
];

const POSITIONS = ['All', 'QB', 'WR', 'RB', 'TE', 'LB', 'DB'];
const LOOKING_FOR = ['All', 'team', '7v7', 'training partner'];

function AthleteCard({ athlete, onConnect }: { athlete: Athlete; onConnect: () => void }) {
  const lookLabels: Record<string, string> = { team: 'Wants a Team', '7v7': '7v7 Squads', 'training partner': 'Training Partner', all: 'Open to All' };
  return (
    <motion.div className="k-card-hover" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} style={{ padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={athleteAvatar(athlete.name)} alt={athlete.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${colors.accent}55`, boxShadow: `0 0 12px ${colors.accent}33` }} />
          {athlete.verified && <div style={{ position: 'absolute', bottom: -2, right: -2, background: colors.accent, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${colors.surface0}` }}><CheckCircle2 size={9} color={colors.accentOn} /></div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', color: colors.textPrimary }}>{athlete.name}</span>
            <Chip selected style={{ fontWeight: t.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{athlete.pos}</Chip>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: colors.textTertiary }}><MapPin size={11} /><span style={{ fontSize: t.size.sm }}>{athlete.school}</span></div>
            <span style={{ color: colors.border, fontSize: t.size.xs }}>·</span>
            <span style={{ fontSize: t.size.sm, color: colors.textTertiary }}>{`'${String(athlete.gradYear).slice(2)}`}</span>
            <span style={{ color: colors.border, fontSize: t.size.xs }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Zap size={10} color={colors.accent} /><span style={{ fontSize: t.size.sm, fontWeight: t.weight.bold, color: colors.accentText }}>{athlete.g5Rating}</span></div>
          </div>
          <p style={{ fontSize: t.size.base, color: colors.textSecondary, margin: '0 0 10px', lineHeight: 1.45 }}>{athlete.bio}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Chip style={{ fontWeight: t.weight.bold, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{lookLabels[athlete.lookingFor]}</Chip>
            <motion.span whileTap={{ scale: 0.93 }}>
              <Button
                variant={athlete.connected ? 'ghost' : 'primary'}
                size="sm"
                onClick={onConnect}
                style={athlete.connected ? { background: `${colors.success}1f`, color: colors.success } : undefined}
              >
                {athlete.connected ? <><CheckCircle2 size={13} /> Connected</> : <><MessageCircle size={13} /> Connect</>}
              </Button>
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const SquadFinder = () => {
  const [athletes, setAthletes] = useState<Athlete[]>(SEED_ATHLETES);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('All');
  const [lookFilter, setLookFilter] = useState('All');

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/athletes', { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((res: { success: boolean; data: SquadApiRow[] } | null) => {
        const data = res?.data;
        if (!data || data.length === 0) return;
        setAthletes(data.slice(0, 20).map((p) => ({ id: p.id, name: p.name || 'Athlete', school: p.school || 'HERS365', state: p.state || 'CA', pos: p.position || 'ATH', gradYear: p.gradYear || 2026, g5Rating: p.g5Rating || 75, verified: !!p.subscriptionTier && p.subscriptionTier !== 'free', bio: p.bio || 'HERS365 athlete.', lookingFor: 'all' as const, connected: false })));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const filtered = athletes.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.school.toLowerCase().includes(search.toLowerCase())) return false;
    if (posFilter !== 'All' && a.pos !== posFilter) return false;
    if (lookFilter !== 'All' && a.lookingFor !== lookFilter && a.lookingFor !== 'all') return false;
    return true;
  });
  const connect = (id: number) => setAthletes((prev) => prev.map((a) => a.id === id ? { ...a, connected: !a.connected } : a));
  const connectionCount = athletes.filter((a) => a.connected).length;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 120px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accentText }}><Users size={13} /> SQUAD FINDER</div>
        <h1 style={{ fontFamily: DISP, fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: t.tracking.h2, margin: '0 0 8px', lineHeight: 1 }}>Find Your People.</h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.md, margin: 0 }}>Connect with athletes nearby. Find a 7v7 squad, training partner, or full team.</p>
      </div>
      {connectionCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${colors.success}1a`, border: `1px solid ${colors.success}33`, borderRadius: radii.full, padding: '5px 12px', marginBottom: 20, fontSize: t.size.sm, fontWeight: t.weight.bold, color: colors.success }}>
          <CheckCircle2 size={13} /> {connectionCount} connection{connectionCount !== 1 ? 's' : ''} made
        </motion.div>
      )}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textTertiary, zIndex: 1 }} />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or school..." style={{ paddingLeft: 36 }} />
      </div>
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
        {POSITIONS.map((p) => (
          <motion.span key={p} whileTap={{ scale: 0.94 }} style={{ flexShrink: 0 }}>
            <Chip selectable selected={posFilter === p} onClick={() => setPosFilter(p)} style={{ fontWeight: t.weight.bold }}>{p}</Chip>
          </motion.span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {LOOKING_FOR.map((l) => (
          <motion.span key={l} whileTap={{ scale: 0.94 }} style={{ flexShrink: 0 }}>
            <Chip selectable selected={lookFilter === l} onClick={() => setLookFilter(l)} style={{ fontWeight: t.weight.bold, whiteSpace: 'nowrap' }}>{l === 'All' ? 'All Types' : l === '7v7' ? '7v7' : l.charAt(0).toUpperCase() + l.slice(1)}</Chip>
          </motion.span>
        ))}
      </div>
      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }}>{filtered.length} athletes found</div>
      <AnimatePresence>
        {filtered.length === 0
          ? <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '48px 0', color: colors.textTertiary }}><Search size={32} style={{ marginBottom: 12, opacity: 0.4 }} /><p style={{ fontSize: t.size.md, margin: 0 }}>No athletes match those filters.</p></motion.div>
          : filtered.map((a) => <AthleteCard key={a.id} athlete={a} onConnect={() => connect(a.id)} />)}
      </AnimatePresence>
    </div>
  );
};
