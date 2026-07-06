import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Flame, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, errorMessage } from '../lib/api';
import { colors, type as t, radii } from '../lib/tokens';
import { staggerDelay } from '../lib/motion';
import { Button, Card, Input, Badge, EmptyState } from '../components/ui';

const DISP = t.font.display;

interface CombineStats {
  id?: number;
  season?: string | null;
  fortyDash?: string | null;
  shuttle?: string | null;
  vertical?: string | null;
  broadJump?: string | null;
  threeCone?: string | null;
}

const samplePrograms = [
  { id: 1, name: 'Elite QB Development',    cat: 'Quarterback',   done: 0, total: 24, level: 'Advanced',     next: 'Pocket Presence & Footwork' },
  { id: 2, name: 'Speed & Agility Mastery', cat: 'Conditioning',  done: 0, total: 18, level: 'Intermediate',  next: 'L-Drill Progression' },
  { id: 3, name: 'Route Running Academy',   cat: 'Wide Receiver',  done: 0, total: 20, level: 'Elite',        next: 'Double-Move Releases' },
];

const sampleDrills = [
  { id: 1, name: 'Pocket Presence & Footwork', dur: '18 min', cat: 'QB',       difficulty: 'Advanced',     done: false },
  { id: 2, name: '3-Step Drop Progression',    dur: '12 min', cat: 'QB',       difficulty: 'Intermediate', done: false },
  { id: 3, name: 'L-Drill Cone Work',          dur: '10 min', cat: 'Agility',  difficulty: 'Beginner',     done: false },
  { id: 4, name: 'Single-Leg RDL Series',      dur: '15 min', cat: 'Strength', difficulty: 'Intermediate', done: false },
  { id: 5, name: 'Hand Fighting Drills',        dur: '8 min',  cat: 'DB',       difficulty: 'Advanced',     done: false },
];

const levelTone: Record<string, 'success' | 'neutral' | 'accent' | 'pink'> = {
  Beginner: 'success', Intermediate: 'neutral', Advanced: 'accent', Elite: 'pink',
};

const ALL = 'All';
const drillCategories = [ALL, ...Array.from(new Set(sampleDrills.map(d => d.cat)))];
const difficulties = [ALL, 'Beginner', 'Intermediate', 'Advanced', 'Elite'];

const METRICS: { key: keyof CombineStats; label: string; unit: string; placeholder: string }[] = [
  { key: 'fortyDash',  label: '40-Yard Dash', unit: 'sec',  placeholder: 'e.g. 4.9' },
  { key: 'shuttle',    label: 'Shuttle',       unit: 'sec',  placeholder: 'e.g. 4.3' },
  { key: 'vertical',   label: 'Vertical',      unit: 'in',   placeholder: 'e.g. 28' },
  { key: 'broadJump',  label: 'Broad Jump',    unit: 'in',   placeholder: 'e.g. 90' },
  { key: 'threeCone',  label: '3-Cone',        unit: 'sec',  placeholder: 'e.g. 7.1' },
];

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`,
  borderRadius: radii.sm, color: colors.textSecondary, fontSize: t.size.xs, padding: '4px 8px', cursor: 'pointer',
};

const kicker: React.CSSProperties = {
  fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary,
};

export const Training = () => {
  const navigate = useNavigate();
  const [drills, setDrills] = useState(sampleDrills);
  const [filterCat, setFilterCat] = useState(ALL);
  const [filterDifficulty, setFilterDifficulty] = useState(ALL);

  const [stats, setStats] = useState<CombineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: CombineStats }>('/api/users/stats');
      setStats(res.data && res.data.id ? res.data : {});
    } catch {
      setStatsError('Failed to load combine results.');
      setStats({});
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const hasAnyStats = stats && METRICS.some(m => stats[m.key]);

  const toggleDrill = (id: number) =>
    setDrills(prev => prev.map(d => d.id === id ? { ...d, done: !d.done } : d));

  const filteredDrills = drills.filter(d =>
    (filterCat === ALL || d.cat === filterCat) &&
    (filterDifficulty === ALL || d.difficulty === filterDifficulty)
  );

  const completedToday = drills.filter(d => d.done).length;

  const handleFormChange = (key: string, value: string) =>
    setFormValues(prev => ({ ...prev, [key]: value }));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    setFormSuccess(false);
    try {
      const body: Record<string, string> = {};
      for (const [k, v] of Object.entries(formValues)) {
        if (v.trim()) body[k] = v.trim();
      }
      await apiFetch('/api/users/stats', { method: 'POST', body: JSON.stringify(body) });
      setFormSuccess(true);
      setShowForm(false);
      setFormValues({});
      await fetchStats();
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save. Try again.'));
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size['2xl'], textTransform: 'uppercase', color: colors.textPrimary, marginBottom: 4 }}>
          Training Academy
        </h1>
        <p style={{ color: colors.textTertiary, fontSize: t.size.base }}>Track your combine results and explore training resources</p>
      </div>

      {/* Today's drill count — real, based on actual checked drills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28, maxWidth: 480 }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ ...kicker, marginBottom: 6 }}>TODAY'S DRILLS</div>
          <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.xl, color: colors.textPrimary, lineHeight: 1, marginBottom: 4 }}>{completedToday}/{drills.length}</div>
          <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>Sample session below</div>
        </Card>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ ...kicker, marginBottom: 6 }}>COMBINE BESTS</div>
          <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.xl, color: colors.textPrimary, lineHeight: 1, marginBottom: 4 }}>
            {statsLoading ? '…' : hasAnyStats ? `${METRICS.filter(m => stats && stats[m.key]).length}/5` : '—'}
          </div>
          <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{hasAnyStats ? 'Metrics recorded' : 'None recorded yet'}</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Left: Performance Testing (real feature) + Sample Programs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Combine Personal Bests */}
          <Card style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={kicker}>Combine Personal Bests</div>
              <Button
                size="sm"
                onClick={() => {
                  const opening = !showForm;
                  if (opening) {
                    const seed: Record<string, string> = {};
                    METRICS.forEach(m => { const v = stats?.[m.key]; if (v) seed[m.key] = String(v); });
                    if (stats?.season) seed.season = String(stats.season);
                    setFormValues(seed);
                  }
                  setShowForm(opening);
                  setFormError(null);
                  setFormSuccess(false);
                }}
              >
                {showForm ? 'Cancel' : 'Record / Update'}
              </Button>
            </div>

            {statsLoading && (
              <div style={{ color: colors.textTertiary, fontSize: t.size.base, padding: '12px 0' }}>Loading…</div>
            )}

            {!statsLoading && statsError && (
              <div style={{ color: colors.accent, fontSize: t.size.base, padding: '8px 0' }}>{statsError}</div>
            )}

            {!statsLoading && !statsError && !hasAnyStats && !showForm && (
              <EmptyState
                title="No combine results yet"
                body="Record your first test to track personal bests"
              />
            )}

            {!statsLoading && !statsError && hasAnyStats && !showForm && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {METRICS.map(m => {
                  const val = stats ? stats[m.key] : null;
                  return (
                    <div key={m.key} style={{
                      background: val ? 'rgba(139,59,255,0.08)' : 'rgba(255,255,255,0.03)',
                      borderRadius: radii.sm, padding: '12px 14px',
                      border: val ? '1px solid rgba(139,59,255,0.18)' : `1px solid ${colors.border}`,
                    }}>
                      <div style={{ ...kicker, fontSize: t.size.xs, letterSpacing: '0.1em', marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.xl, color: val ? colors.textPrimary : colors.textTertiary, lineHeight: 1, marginBottom: 2 }}>
                        {val ?? '—'}
                      </div>
                      {val && <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{m.unit}</div>}
                    </div>
                  );
                })}
                {stats?.season && (
                  <div style={{ gridColumn: '1/-1', fontSize: t.size.xs, color: colors.textTertiary, marginTop: 4 }}>Season: {stats.season}</div>
                )}
              </div>
            )}

            {showForm && (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {METRICS.map(m => (
                    <Input
                      key={m.key}
                      type="text"
                      label={`${m.label} (${m.unit})`}
                      placeholder={m.placeholder}
                      value={formValues[m.key] ?? ''}
                      onChange={e => handleFormChange(m.key, e.target.value)}
                    />
                  ))}
                  <Input
                    type="text"
                    label="Season"
                    placeholder="e.g. 2026"
                    value={formValues.season ?? ''}
                    onChange={e => handleFormChange('season', e.target.value)}
                  />
                </div>

                {formError && <div style={{ color: colors.accent, fontSize: t.size.base }}>{formError}</div>}

                <Button type="submit" loading={formSaving} style={{ alignSelf: 'flex-start' }}>
                  {formSaving ? 'Saving…' : 'Save Results'}
                </Button>
              </form>
            )}

            {formSuccess && !showForm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.success, fontSize: t.size.sm, marginTop: 8 }}>
                <CheckCircle size={13} /> Results saved
              </div>
            )}
          </Card>

          {/* Sample Programs — clearly labeled as preview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={kicker}>Sample Programs</span>
              <Badge tone="pink">Preview</Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {samplePrograms.map((p, i) => {
                const pct = Math.round((p.done / p.total) * 100);
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: staggerDelay(i) }}>
                    <Card hover style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: t.size.md, fontWeight: t.weight.bold, color: colors.textPrimary, marginBottom: 3 }}>{p.name}</div>
                          <div style={{ fontSize: t.size.sm, color: colors.textTertiary }}>{p.cat}</div>
                        </div>
                        <Badge tone={levelTone[p.level] || 'accent'} style={{ flexShrink: 0, marginLeft: 12 }}>{p.level}</Badge>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{p.done}/{p.total} sessions</span>
                          <span style={{ fontSize: t.size.sm, fontWeight: t.weight.bold, color: colors.accent }}>{pct}%</span>
                        </div>
                        <div className="k-progress-track">
                          <div className="k-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: t.size.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Next</div>
                        <div style={{ fontSize: t.size.base, color: colors.textSecondary, fontWeight: t.weight.medium }}>{p.next}</div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Today's sample session + Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Today's session */}
          <Card style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={kicker}>Sample Session</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={13} color={colors.accent} />
                <span style={{ fontSize: t.size.sm, color: colors.accent, fontWeight: t.weight.bold }}>{completedToday}/{drills.length}</span>
              </div>
            </div>
            <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginBottom: 12 }}>Example drills — check off as you go</div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                style={selectStyle}
              >
                {drillCategories.map(c => <option key={c} value={c}>{c === ALL ? 'All Categories' : c}</option>)}
              </select>
              <select
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value)}
                style={selectStyle}
              >
                {difficulties.map(d => <option key={d} value={d}>{d === ALL ? 'All Levels' : d}</option>)}
              </select>
            </div>

            {/* Progress bar — real: reflects actual checked count */}
            <div className="k-progress-track" style={{ marginBottom: 16 }}>
              <div className="k-progress-fill" style={{ width: `${(completedToday / drills.length) * 100}%` }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredDrills.map(d => (
                <button key={d.id} onClick={() => toggleDrill(d.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 0', textAlign: 'left',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  opacity: d.done ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}>
                  {d.done
                    ? <CheckCircle size={16} color={colors.accent} fill={colors.accent} style={{ flexShrink: 0 }} />
                    : <div style={{ width: 16, height: 16, borderRadius: radii.full, border: `1.5px solid ${colors.borderStrong}`, flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: t.size.base, color: d.done ? colors.textTertiary : colors.textSecondary, fontWeight: t.weight.medium, textDecoration: d.done ? 'line-through' : 'none' }}>{d.name}</div>
                    <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginTop: 1 }}>{d.cat}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <Clock size={11} color={colors.textTertiary} />
                    <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{d.dur}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Quick actions */}
          <Card style={{ padding: '18px 16px' }}>
            <div style={{ ...kicker, marginBottom: 14 }}>Quick Actions</div>
            {[
              { label: 'Browse All Drills',     path: '/drills' },
              { label: 'Schedule a Session',    path: '/events' },
              { label: 'Track Performance',     path: '/rankings' },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => navigate(path)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none',
                padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', color: colors.textSecondary, fontSize: t.size.base, fontWeight: t.weight.medium,
              }}>
                {label}
                <ChevronRight size={14} color={colors.textTertiary} />
              </button>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};
