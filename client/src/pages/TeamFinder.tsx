import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Users, Star, ChevronRight } from 'lucide-react';
import { colors, type as t } from '../lib/tokens';
import { Card, Chip, Input } from '../components/ui';

const DISP = t.font.display;

type Team = {
  id?: number;
  name: string;
  city: string;
  state: string;
  level: string;
  type: string;
  roster: number;
  record?: string;
  openSpots: number;
};

interface TeamsApiRow {
  id: number;
  name: string;
  city?: string;
  state?: string;
  division?: string;
  type?: string;
  wins?: number;
  losses?: number;
}

const FALLBACK_TEAMS: Team[] = [
  { name: 'Valley Oak Wolves', city: 'Sacramento', state: 'CA', level: 'Varsity', type: 'School', roster: 22, record: '8-2', openSpots: 2 },
  { name: 'Bay Blazers 7v7', city: 'Oakland', state: 'CA', level: 'Travel', type: '7v7', roster: 14, openSpots: 4 },
  { name: 'SoCal Fire', city: 'Riverside', state: 'CA', level: 'Travel', type: '7v7', roster: 12, record: '14-3', openSpots: 0 },
  { name: 'Phoenix Rising', city: 'Phoenix', state: 'AZ', level: 'Varsity', type: 'School', roster: 28, record: '6-4', openSpots: 3 },
  { name: 'Lone Star Elite', city: 'Austin', state: 'TX', level: 'Elite', type: '7v7', roster: 15, record: '22-5', openSpots: 1 },
  { name: 'Pacific Wave', city: 'Seattle', state: 'WA', level: 'Travel', type: 'Flag', roster: 18, openSpots: 5 },
];

export const TeamFinder = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [teams, setTeams] = useState<Team[]>(FALLBACK_TEAMS);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/teams', { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((res: { success: boolean; data: TeamsApiRow[] } | null) => {
        if (!res?.success || !res.data?.length) return;
        setTeams(res.data.map((tm) => ({
          id: tm.id,
          name: tm.name,
          city: tm.city ?? '',
          state: tm.state ?? '',
          level: tm.division ?? 'Varsity',
          type: tm.type ?? 'School',
          roster: 0,
          record: tm.wins != null && tm.losses != null ? `${tm.wins}-${tm.losses}` : undefined,
          openSpots: 0,
        })));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const filtered = teams.filter((tm) => {
    if (type !== 'All' && tm.type !== type) return false;
    if (query && !tm.name.toLowerCase().includes(query.toLowerCase()) && !tm.city.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accentText }}>
          <Users size={13} /> TEAM FINDER
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: t.size['3xl'], fontWeight: 900, textTransform: 'uppercase', letterSpacing: t.tracking.h2, margin: '0 0 8px', lineHeight: 1 }}>Find Your Team.</h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.base, margin: 0 }}>School squads, travel teams, and 7v7 programs looking for athletes.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textTertiary, zIndex: 1 }} />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Team name or city..." style={{ paddingLeft: 34 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {['All', 'School', '7v7', 'Flag'].map((tm) => (
            <motion.span key={tm} whileTap={{ scale: 0.94 }}>
              <Chip selectable selected={type === tm} onClick={() => setType(tm)} style={{ fontWeight: t.weight.bold }}>{tm}</Chip>
            </motion.span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((tm, i) => (
          <motion.div key={tm.id ?? i} whileHover={{ x: 3 }}>
            <Card hover style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: t.weight.bold, fontSize: t.size.md, color: colors.textPrimary }}>{tm.name}</div>
                  {tm.openSpots > 0 && <Chip selected style={{ fontWeight: t.weight.bold }}>{tm.openSpots} spot{tm.openSpots !== 1 ? 's' : ''} open</Chip>}
                  {tm.openSpots === 0 && <Chip style={{ fontWeight: t.weight.bold, color: colors.textTertiary }}>FULL</Chip>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: t.size.sm, color: colors.textSecondary }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{tm.city}, {tm.state}</span>
                  {tm.roster > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} />{tm.roster} players</span>}
                  {tm.record && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={11} />{tm.record}</span>}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Chip style={{ color: colors.textTertiary }}>{tm.level} · {tm.type}</Chip>
                </div>
              </div>
              <ChevronRight size={16} color={colors.textTertiary} />
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '36px', color: colors.textTertiary, fontSize: t.size.base }}>No teams found.</div>}
      </div>
    </div>
  );
};
