import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Calendar, ChevronRight, Trophy } from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';
import { Card, Chip } from '../components/ui';

const DISP = t.font.display;

const STATES = ['CA', 'TX', 'FL', 'OH', 'GA', 'AZ', 'WA', 'CO', 'NY', 'NC'];
const FORMATS = ['All', '7v7', 'Flag', 'Combined'];

type League = {
  id?: number;
  name: string;
  state: string;
  city: string;
  format: string;
  teams: number;
  season: string;
  level: string;
  open: boolean;
};

interface LeagueApiRow {
  id: number;
  name: string;
  state?: string;
  city?: string;
  format?: string;
  ageGroups?: string;
  season?: string;
  registrationOpen?: boolean;
}

const FALLBACK_LEAGUES: League[] = [
  { name: 'SoCal Girls Flag Football League', state: 'CA', city: 'Los Angeles', format: 'Flag', teams: 24, season: 'Fall 2025', level: 'High School', open: true },
  { name: 'Bay Area 7v7 Circuit', state: 'CA', city: 'San Jose', format: '7v7', teams: 16, season: 'Spring 2026', level: 'All Ages', open: true },
  { name: 'Texas Girls Flag Alliance', state: 'TX', city: 'Dallas', format: 'Flag', teams: 32, season: 'Fall 2025', level: 'High School', open: false },
  { name: 'Florida Girls 7v7 Classic', state: 'FL', city: 'Orlando', format: '7v7', teams: 20, season: 'Spring 2026', level: 'HS & College', open: true },
  { name: 'Buckeye Flag Football Association', state: 'OH', city: 'Columbus', format: 'Combined', teams: 18, season: 'Fall 2025', level: 'High School', open: true },
  { name: 'Pacific Northwest Flag Circuit', state: 'WA', city: 'Seattle', format: 'Flag', teams: 14, season: 'Fall 2025', level: 'All Ages', open: false },
];

export const LeagueFinder = () => {
  const [state, setState] = useState('');
  const [format, setFormat] = useState('All');
  const [openOnly, setOpenOnly] = useState(false);
  const [leagues, setLeagues] = useState<League[]>(FALLBACK_LEAGUES);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (format !== 'All') params.set('format', format);
    const qs = params.toString();
    fetch(`/api/leagues${qs ? `?${qs}` : ''}`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((res: { success: boolean; data: LeagueApiRow[] } | null) => {
        if (!res?.success || !res.data?.length) return;
        setLeagues(res.data.map((l) => ({
          id: l.id,
          name: l.name,
          state: l.state ?? '',
          city: l.city ?? '',
          format: l.format ?? 'Flag',
          teams: 0,
          season: l.season ?? '',
          level: l.ageGroups ?? 'All Ages',
          open: l.registrationOpen ?? false,
        })));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [state, format]);

  const filtered = leagues.filter((l) => {
    if (state && l.state !== state) return false;
    if (format !== 'All' && l.format !== format) return false;
    if (openOnly && !l.open) return false;
    return true;
  });

  const labelStyle = { fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.textTertiary, marginBottom: 6 };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accentText }}>
          <Trophy size={13} /> LEAGUE FINDER
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: t.size['3xl'], fontWeight: 900, textTransform: 'uppercase', letterSpacing: t.tracking.h2, margin: '0 0 8px', lineHeight: 1 }}>Find Your League.</h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.base, margin: 0 }}>Girls flag football leagues and 7v7 circuits near you.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={labelStyle}>State</div>
          <select className="k-input" value={state} onChange={(e) => setState(e.target.value)} style={{ padding: '8px 12px', fontSize: t.size.base }}>
            <option value="">All States</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Format</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {FORMATS.map((f) => (
              <motion.span key={f} whileTap={{ scale: 0.94 }}>
                <Chip selectable selected={format === f} onClick={() => setFormat(f)} style={{ fontWeight: t.weight.bold }}>{f}</Chip>
              </motion.span>
            ))}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', alignSelf: 'flex-end', paddingBottom: 4 }}>
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} style={{ accentColor: colors.accent }} />
          <span style={{ fontSize: t.size.base, color: colors.textSecondary }}>Open registration only</span>
        </label>
      </div>

      <div style={{ fontSize: t.size.sm, color: colors.textTertiary, marginBottom: 14 }}>{filtered.length} league{filtered.length !== 1 ? 's' : ''} found</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((l, i) => (
          <motion.div key={l.id ?? i} whileHover={{ x: 3 }}>
            <Card hover style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: t.weight.bold, fontSize: t.size.md, color: colors.textPrimary }}>{l.name}</div>
                  {l.open && <span style={{ padding: '2px 7px', background: `${colors.success}1f`, border: `1px solid ${colors.success}40`, borderRadius: radii.full, fontSize: t.size.xs, fontWeight: t.weight.bold, color: colors.success }}>OPEN</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: t.size.sm, color: colors.textSecondary }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{l.city}, {l.state}</span>
                  {l.teams > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} />{l.teams} teams</span>}
                  {l.season && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />{l.season}</span>}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <Chip selected style={{ fontWeight: t.weight.bold }}>{l.format}</Chip>
                  <Chip style={{ color: colors.textTertiary }}>{l.level}</Chip>
                </div>
              </div>
              <ChevronRight size={16} color={colors.textTertiary} />
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '36px', color: colors.textTertiary, fontSize: t.size.base }}>No leagues match your filters.</div>}
      </div>
    </div>
  );
};
