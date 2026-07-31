import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Trophy, Users, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { EmptyState, Input, Button } from '../components/ui';
import { colors, type as t, radii } from '../lib/tokens';

const DISP = t.font.display;
const LINE = colors.border;

type MPPlayer = {
  maxprepsId?: string;
  name: string;
  school?: string;
  state?: string;
  stats: {
    touchdowns?: number;
    passingYards?: number;
    rushingYards?: number;
    receptions?: number;
    receivingYards?: number;
    interceptions?: number;
  };
};

type MPTeam = {
  name: string;
  state?: string;
  wins?: number;
  losses?: number;
  rank?: number;
};

const STATES = ['', 'CA', 'TX', 'FL', 'OH', 'GA', 'AZ', 'WA', 'CO', 'NY', 'NC'];
const CATS = ['passing', 'rushing', 'receiving', 'touchdowns', 'interceptions'];

type Tab = 'search' | 'leaders' | 'rankings';

const fieldLabel = { fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.textTertiary, marginBottom: 6 };

export const MaxPrepsLookup = () => {
  const [tab, setTab] = useState<Tab>('leaders');

  // Player search
  const [searchName, setSearchName] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState<MPPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Leaders
  const [leaderCat, setLeaderCat] = useState('touchdowns');
  const [leaderState, setLeaderState] = useState('');
  const [leaders, setLeaders] = useState<MPPlayer[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [leadersLoaded, setLeadersLoaded] = useState(false);

  // Rankings
  const [rankState, setRankState] = useState('CA');
  const [teams, setTeams] = useState<MPTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  const fetchLeaders = async () => {
    setLoadingLeaders(true);
    try {
      const qs = new URLSearchParams({ category: leaderCat });
      if (leaderState) qs.set('state', leaderState);
      const res = await fetch(`/api/maxpreps/leaders?${qs}`);
      const data = await res.json();
      setLeaders(data.leaders || []);
    } catch {
      setLeaders([]);
    } finally {
      setLoadingLeaders(false);
      setLeadersLoaded(true);
    }
  };

  const fetchRankings = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch(`/api/maxpreps/rankings?state=${rankState}`);
      const data = await res.json();
      setTeams(data.teams || []);
    } catch {
      setTeams([]);
    } finally {
      setLoadingTeams(false);
      setTeamsLoaded(true);
    }
  };

  const searchPlayers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;
    setSearching(true);
    try {
      const qs = new URLSearchParams({ name: searchName });
      if (searchState) qs.set('state', searchState);
      const res = await fetch(`/api/maxpreps/player?${qs}`);
      const data = await res.json();
      setSearchResults(data.players || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const statLine = (p: MPPlayer) => {
    const s = p.stats;
    const parts: string[] = [];
    if (s.touchdowns) parts.push(`${s.touchdowns} TDs`);
    if (s.passingYards) parts.push(`${s.passingYards} pass yds`);
    if (s.rushingYards) parts.push(`${s.rushingYards} rush yds`);
    if (s.receivingYards) parts.push(`${s.receivingYards} rec yds`);
    if (s.receptions) parts.push(`${s.receptions} rec`);
    if (s.interceptions) parts.push(`${s.interceptions} INT`);
    return parts.join(' · ') || 'No stats available';
  };

  const rankRow = (label: React.ReactNode, sub: React.ReactNode, right: React.ReactNode, index: number, key: React.Key) => (
    <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: radii.md, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: index < 3 ? `${colors.accent}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${index < 3 ? colors.accent : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: DISP, fontWeight: 900, fontSize: t.size.md, color: index < 3 ? colors.accentText : colors.textSecondary }}>
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{sub}</div>
      {right}
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accentText }}>
          <Trophy size={13} /> MAXPREPS
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: t.size['3xl'], fontWeight: 900, textTransform: 'uppercase', letterSpacing: t.tracking.h2, margin: '0 0 8px', lineHeight: 1 }}>
          Girls Flag Football Stats
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.base, margin: 0 }}>Live data from MaxPreps — national stat leaders, team rankings, and player lookup.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {([
          { id: 'leaders', label: 'Stat Leaders', icon: <TrendingUp size={13} /> },
          { id: 'rankings', label: 'Team Rankings', icon: <Trophy size={13} /> },
          { id: 'search', label: 'Player Search', icon: <Search size={13} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((tb) => (
          <motion.button key={tb.id} whileTap={{ scale: 0.95 }} onClick={() => setTab(tb.id)} style={{
            padding: '8px 14px', borderRadius: radii.full, border: 'none', cursor: 'pointer',
            background: tab === tb.id ? colors.accent : 'rgba(255,255,255,0.05)',
            color: tab === tb.id ? colors.accentOn : colors.textSecondary,
            fontSize: t.size.sm, fontWeight: t.weight.bold, display: 'flex', alignItems: 'center', gap: 5,
          }}>{tb.icon}{tb.label}</motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* LEADERS TAB */}
        {tab === 'leaders' && (
          <motion.div key="leaders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div style={fieldLabel}>Category</div>
                <select className="k-input" value={leaderCat} onChange={(e) => { setLeaderCat(e.target.value); setLeadersLoaded(false); }} style={{ padding: '8px 12px', fontSize: t.size.base }}>
                  {CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <div style={fieldLabel}>State</div>
                <select className="k-input" value={leaderState} onChange={(e) => { setLeaderState(e.target.value); setLeadersLoaded(false); }} style={{ padding: '8px 12px', fontSize: t.size.base }}>
                  <option value="">National</option>
                  {STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <motion.span whileTap={{ scale: 0.95 }}>
                <Button onClick={fetchLeaders} loading={loadingLeaders} disabled={loadingLeaders}>
                  {loadingLeaders ? 'Loading…' : 'Load Leaders'}
                </Button>
              </motion.span>
            </div>
            {leadersLoaded && (
              leaders.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="w-10 h-10" />}
                  title="No data available"
                  body="MaxPreps may not have current season data for this filter. Try a different category or state."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leaders.map((p, i) => rankRow(
                    i + 1,
                    <>
                      <div style={{ fontWeight: t.weight.bold, fontSize: t.size.md, color: colors.textPrimary, marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{p.school}{p.state ? ` · ${p.state}` : ''}</div>
                    </>,
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: DISP, fontSize: t.size.md, fontWeight: 900, color: colors.accentText }}>{statLine(p).split(' · ')[0]}</div>
                      <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{statLine(p).split(' · ').slice(1).join(' · ')}</div>
                    </div>,
                    i,
                    i,
                  ))}
                </div>
              )
            )}
            {!leadersLoaded && !loadingLeaders && (
              <div style={{ textAlign: 'center', padding: '32px', color: colors.textTertiary, fontSize: t.size.base, border: `1px dashed ${LINE}`, borderRadius: radii.lg }}>
                Select a category and tap "Load Leaders"
              </div>
            )}
          </motion.div>
        )}

        {/* RANKINGS TAB */}
        {tab === 'rankings' && (
          <motion.div key="rankings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <div style={fieldLabel}>State</div>
                <select className="k-input" value={rankState} onChange={(e) => { setRankState(e.target.value); setTeamsLoaded(false); }} style={{ padding: '8px 12px', fontSize: t.size.base }}>
                  {STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <motion.span whileTap={{ scale: 0.95 }}>
                <Button onClick={fetchRankings} loading={loadingTeams} disabled={loadingTeams}>
                  {loadingTeams ? 'Loading…' : 'Load Rankings'}
                </Button>
              </motion.span>
            </div>
            {teamsLoaded && (
              teams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: colors.textTertiary, fontSize: t.size.base }}>No rankings available for {rankState}.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {teams.map((tm, i) => rankRow(
                    tm.rank ?? i + 1,
                    <>
                      <div style={{ fontWeight: t.weight.bold, fontSize: t.size.md, color: colors.textPrimary }}>{tm.name}</div>
                      <div style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{tm.state}</div>
                    </>,
                    (tm.wins !== undefined || tm.losses !== undefined) ? (
                      <div style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: 900, color: colors.textPrimary }}>
                        {tm.wins ?? 0}–{tm.losses ?? 0}
                      </div>
                    ) : null,
                    i,
                    i,
                  ))}
                </div>
              )
            )}
            {!teamsLoaded && !loadingTeams && (
              <div style={{ textAlign: 'center', padding: '32px', color: colors.textTertiary, fontSize: t.size.base, border: `1px dashed ${LINE}`, borderRadius: radii.lg }}>
                Select a state and tap "Load Rankings"
              </div>
            )}
          </motion.div>
        )}

        {/* SEARCH TAB */}
        {tab === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <form onSubmit={searchPlayers} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <div style={fieldLabel}>Player Name</div>
                <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="First or last name..." />
              </div>
              <div>
                <div style={fieldLabel}>State</div>
                <select className="k-input" value={searchState} onChange={(e) => setSearchState(e.target.value)} style={{ padding: '9px 12px', fontSize: t.size.base }}>
                  <option value="">Any</option>
                  {STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <motion.span whileTap={{ scale: 0.95 }}>
                <Button type="submit" loading={searching} disabled={searching}>
                  <Search size={14} />{searching ? 'Searching…' : 'Search'}
                </Button>
              </motion.span>
            </form>
            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: t.size.sm, color: colors.textSecondary, marginBottom: 4 }}><Users size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</div>
                {searchResults.map((p, i) => {
                  const key = p.maxprepsId || `${p.name}-${i}`;
                  const isOpen = expanded === key;
                  return (
                    <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? `${colors.accent}40` : LINE}`, borderRadius: radii.md, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                      <button onClick={() => setExpanded(isOpen ? null : key)} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontWeight: t.weight.bold, fontSize: t.size.md, color: colors.textPrimary }}>{p.name}</div>
                          <div style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{p.school}{p.state ? ` · ${p.state}` : ''}</div>
                        </div>
                        {isOpen ? <ChevronUp size={15} color={colors.accent} /> : <ChevronDown size={15} color={colors.textTertiary} />}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                              {Object.entries(p.stats).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => (
                                <div key={k} style={{ background: `${colors.accent}14`, border: `1px solid ${colors.accent}30`, borderRadius: radii.sm, padding: '6px 12px', textAlign: 'center' }}>
                                  <div style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: 900, color: colors.accentText }}>{v as number}</div>
                                  <div style={{ fontSize: t.size.xs, color: colors.textSecondary, fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                                </div>
                              ))}
                              {Object.values(p.stats).every((v) => !v) && (
                                <div style={{ color: colors.textTertiary, fontSize: t.size.base }}>No detailed stats on MaxPreps for this player.</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
            {searchResults.length === 0 && !searching && searchName && (
              <div style={{ textAlign: 'center', padding: '32px', color: colors.textTertiary, fontSize: t.size.base }}>No players found for "{searchName}".</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
