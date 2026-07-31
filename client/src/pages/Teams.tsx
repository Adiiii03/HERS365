import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ChevronRight, Plus, CheckCircle2, Shield } from 'lucide-react';
import { athleteAvatar } from '../lib/avatar';
import { useAuth } from '../context/AuthContext';
import { colors, type as t, radii } from '../lib/tokens';
import { Card, Button, Badge } from '../components/ui';

const DISP = t.font.display;

const teams = [
  {
    id: 1,
    name: 'Westlake Wolfpack',
    school: 'Westlake HS',
    location: 'Austin, TX',
    record: '14-2',
    ranking: 1,
    players: 18,
    division: 'Varsity',
    conference: 'Texas 5A',
    coachName: 'Coach Martinez',
    wins: 14,
    losses: 2,
    pointsFor: 412,
    pointsAgainst: 198,
    roster: [
      { name: 'Featured Athlete', pos: 'QB', score: 95, verified: true },
      { name: 'Maya Johnson',  pos: 'WR', score: 92, verified: true },
      { name: 'Chloe Zhang',   pos: 'RB', score: 90, verified: true },
      { name: 'Ava Mitchell',  pos: 'LB', score: 89, verified: true },
    ],
  },
  {
    id: 2,
    name: 'Summit Storm',
    school: 'Summit Prep',
    location: 'Denver, CO',
    record: '12-4',
    ranking: 4,
    players: 16,
    division: 'Varsity',
    conference: 'Colorado 4A',
    coachName: 'Coach Davis',
    wins: 12,
    losses: 4,
    pointsFor: 348,
    pointsAgainst: 241,
    roster: [
      { name: "Emma O'Connor",  pos: 'QB', score: 89, verified: false },
      { name: 'Jordan Lee',     pos: 'WR', score: 88, verified: true },
      { name: 'Priya Patel',    pos: 'DB', score: 87, verified: false },
      { name: 'Taylor Brooks',  pos: 'RB', score: 86, verified: true },
    ],
  },
  {
    id: 3,
    name: 'Centennial Blaze',
    school: 'Centennial HS',
    location: 'Los Angeles, CA',
    record: '11-5',
    ranking: 7,
    players: 20,
    division: 'Varsity',
    conference: 'California 6A',
    coachName: 'Coach Thompson',
    wins: 11,
    losses: 5,
    pointsFor: 301,
    pointsAgainst: 278,
    roster: [
      { name: 'Isabella Reyes', pos: 'DB', score: 91, verified: true },
      { name: 'Zoe Williams',   pos: 'QB', score: 85, verified: true },
    ],
  },
];

const divisions = ['All', 'Varsity', 'JV', 'Youth'];

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <img
      src={athleteAvatar(name)}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', background: colors.surface2, flexShrink: 0, objectFit: 'cover' }}
    />
  );
}

export const Teams = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(1);
  const [division, setDivision] = useState('All');

  const teamsWithUser = useMemo(() => {
    if (!user?.name) return teams;
    return teams.map(t =>
      t.id === 1
        ? { ...t, roster: t.roster.map((p, i) => (i === 0 ? { ...p, name: user.name } : p)) }
        : t,
    );
  }, [user]);

  const filtered = teamsWithUser.filter(t => division === 'All' || t.division === division);
  const activeTeam = teamsWithUser.find(t => t.id === selected) ?? teamsWithUser[0];

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size['2xl'], textTransform: 'uppercase', color: colors.textPrimary, marginBottom: 4 }}>
            Teams
          </h1>
          <p style={{ color: colors.textTertiary, fontSize: t.size.base }}>Top-ranked girls flag football programs</p>
        </div>
        <Button style={{ letterSpacing: '0.04em' }}>
          <Plus size={14} /> CREATE TEAM
        </Button>
      </div>

      {/* Division filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {divisions.map(d => (
          <button key={d} onClick={() => setDivision(d)} style={{
            background: division === d ? colors.accent : 'transparent',
            border: '1px solid',
            borderColor: division === d ? colors.accent : 'rgba(255,255,255,0.08)',
            borderRadius: radii.sm, padding: '7px 16px',
            color: division === d ? colors.accentOn : colors.textTertiary,
            fontSize: t.size.sm, fontWeight: t.weight.bold, cursor: 'pointer', transition: 'all 0.15s',
          }}>{d}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>

        {/* Team list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((team, i) => (
            <motion.div key={team.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(team.id)}
              style={{
                padding: '16px',
                background: selected === team.id ? `${colors.accent}14` : colors.surface1,
                border: `1px solid ${selected === team.id ? `${colors.accent}59` : colors.border}`,
                borderRadius: radii.md, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.md, color: colors.textPrimary }}>{team.name}</span>
                    {team.ranking <= 3 && <Shield size={12} color={colors.accent} fill={`${colors.accent}33`} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={10} color={colors.textTertiary} />
                    <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{team.location}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.xl, color: colors.accent, lineHeight: 1 }}>#{team.ranking}</div>
                  <div style={{ fontSize: '0.62rem', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rank</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '2px 8px', fontSize: t.size.xs, color: colors.textSecondary, fontWeight: t.weight.semibold }}>{team.record}</span>
                <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{team.players} players</span>
                <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{team.conference}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Team detail */}
        <motion.div key={activeTeam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>

          {/* Header card */}
          <Card style={{ padding: '22px 20px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: `radial-gradient(circle, ${colors.accent}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size['2xl'], textTransform: 'uppercase', color: colors.textPrimary, lineHeight: 1 }}>{activeTeam.name}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{activeTeam.school}</span>
                  <span style={{ color: colors.textTertiary }}>·</span>
                  <span style={{ fontSize: t.size.sm, color: colors.textTertiary }}>{activeTeam.conference}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} color={colors.textTertiary} />
                  <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{activeTeam.location}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size['4xl'], color: colors.accent, lineHeight: 1 }}>#{activeTeam.ranking}</div>
                <div style={{ fontSize: '0.62rem', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>National</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: `1px solid ${colors.border}`, paddingTop: 16, gap: 0 }}>
              {[
                { label: 'Record',  value: activeTeam.record },
                { label: 'Players', value: activeTeam.players },
                { label: 'Pts For', value: activeTeam.pointsFor },
                { label: 'Pts Agn', value: activeTeam.pointsAgainst },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${colors.border}` : 'none', padding: '0 8px' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.lg, color: colors.textSecondary }}>{value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Roster */}
          <Card style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary }}>Key Players</span>
              <button style={{ background: 'none', border: 'none', color: colors.accent, fontSize: t.size.sm, fontWeight: t.weight.bold, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Full Roster <ChevronRight size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activeTeam.roster.map((player, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <Avatar name={player.name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: t.size.base, fontWeight: t.weight.semibold, color: colors.textSecondary }}>{player.name}</span>
                      {player.verified && <CheckCircle2 size={11} color={colors.accent} fill={colors.accent} />}
                    </div>
                    <Badge tone="accent">{player.pos}</Badge>
                  </div>
                  <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.lg, color: colors.accent }}>{player.score}</span>
                </div>
              ))}
            </div>
          </Card>

        </motion.div>
      </div>
    </div>
  );
};
