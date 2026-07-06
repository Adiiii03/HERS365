import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, DollarSign, Clock, CheckCircle2,
  XCircle, TrendingUp, Plus,
  ChevronRight, Award, Bookmark,
} from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';
import { Card, Button } from '../components/ui';

const DISP = t.font.display;
const LINE = colors.border;

type ScholarshipStatus = 'tracking' | 'applied' | 'interview' | 'offer' | 'declined';

type Scholarship = {
  id: number;
  name: string;
  amount: number;
  deadline: string;
  requirements: string | null;
  category: string | null;
  eligibleStates: string | null;
  createdAt: string | null;
};

const STATUS_CONFIG: Record<ScholarshipStatus, { label: string; color: string; bg: string }> = {
  tracking:  { label: 'Tracking',  color: colors.textSecondary, bg: 'rgba(255,255,255,0.05)' },
  applied:   { label: 'Applied',   color: colors.accentText,    bg: `${colors.accent}1a` },
  interview: { label: 'Interview', color: colors.pinkText,      bg: `${colors.pink}1a` },
  offer:     { label: 'Offer',     color: colors.success,       bg: `${colors.success}1a` },
  declined:  { label: 'Declined',  color: colors.danger,        bg: `${colors.danger}1a` },
};

const STATUS_ORDER: ScholarshipStatus[] = ['offer', 'interview', 'applied', 'tracking', 'declined'];

export const ScholarshipTracker = () => {
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScholarshipStatus | 'All'>('All');
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/scholarships', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setItems(data.data);
        } else {
          setError(data.error || 'Failed to load scholarships');
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError('Failed to load scholarships');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleSave = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/scholarships/${id}/save`, { method: 'POST' });
      const data = await res.json();
      if (data.success) setSaved(prev => ({ ...prev, [id]: true }));
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const filtered = statusFilter === 'All'
    ? items
    : items;

  const stats = {
    total: items.length,
    saved: Object.values(saved).filter(Boolean).length,
    deadlineSoon: items.filter(s => {
      const d = new Date(s.deadline);
      const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length,
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 20px', textAlign: 'center', color: colors.textSecondary }}>
        <GraduationCap size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
        <p style={{ fontSize: t.size.md, margin: 0 }}>Loading scholarships...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 20px', textAlign: 'center', color: colors.danger }}>
        <XCircle size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
        <p style={{ fontSize: t.size.md, margin: 0 }}>{error}</p>
      </div>
    );
  }

  const statCards = [
    { icon: <TrendingUp size={14} />, val: stats.total, label: 'Available', color: colors.accentText },
    { icon: <Clock size={14} />, val: stats.deadlineSoon, label: 'Due Soon', color: colors.pinkText },
    { icon: <Award size={14} />, val: stats.saved, label: 'Saved', color: colors.success },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 120px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accentText }}>
          <GraduationCap size={13} /> SCHOLARSHIP TRACKER
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: t.tracking.h2, margin: '0 0 8px', lineHeight: 1 }}>
          Your Future. Tracked.
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.md, margin: 0 }}>
          Manage every school, offer, and deadline in one place. Never miss a window.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <Card key={i} style={{ borderColor: s.val > 0 ? `${s.color}33` : LINE, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: s.val > 0 ? s.color : colors.textTertiary }}>{s.icon}</div>
            <div style={{ fontFamily: DISP, fontSize: t.size.xl, fontWeight: 900, color: s.val > 0 ? s.color : colors.textPrimary, letterSpacing: t.tracking.h2 }}>{s.val}</div>
            <div style={{ fontSize: t.size.xs, color: colors.textTertiary, fontWeight: t.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {(['All', ...STATUS_ORDER] as const).map((s) => {
          const cfg = s === 'All' ? { color: colors.accentText, bg: `${colors.accent}18` } : STATUS_CONFIG[s];
          const active = statusFilter === s;
          return (
            <motion.button key={s} whileTap={{ scale: 0.94 }} onClick={() => setStatusFilter(s as typeof statusFilter)}
              style={{ padding: '5px 13px', borderRadius: radii.full, border: 'none', background: active ? cfg.bg : 'rgba(255,255,255,0.04)', color: active ? cfg.color : colors.textTertiary, fontSize: t.size.sm, fontWeight: t.weight.bold, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s' }}>
              {s === 'All' ? 'All' : STATUS_CONFIG[s].label}
            </motion.button>
          );
        })}
      </div>

      {filtered.map((item) => (
        <motion.div key={item.id} className="k-card-hover" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: radii.md, background: `${colors.accent}1a`, border: `1px solid ${colors.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GraduationCap size={18} color={colors.accent} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', color: colors.textPrimary }}>{item.name}</span>
                {item.category && (
                  <span style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: radii.sm, background: `${colors.accent}18`, color: colors.accentText, border: `1px solid ${colors.accent}30` }}>{item.category}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: colors.success }}>
                  <DollarSign size={11} />
                  <span style={{ fontSize: t.size.sm, fontWeight: t.weight.bold }}>${item.amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: colors.textTertiary }}>
                  <Clock size={11} />
                  <span style={{ fontSize: t.size.sm }}>Due {item.deadline}</span>
                </div>
              </div>

              {item.requirements && (
                <p style={{ fontSize: t.size.base, color: colors.textSecondary, margin: '0 0 10px', lineHeight: 1.45 }}>{item.requirements}</p>
              )}

              {item.eligibleStates && (
                <p style={{ fontSize: t.size.sm, color: colors.textTertiary, margin: '0 0 10px' }}>States: {item.eligibleStates}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saved[item.id] && (
                    <span style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: radii.sm, background: `${colors.success}1a`, color: colors.success, border: `1px solid ${colors.success}4d`, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> Saved
                    </span>
                  )}
                </div>
                {!saved[item.id] && (
                  <motion.span whileTap={{ scale: 0.93 }}>
                    <Button size="sm" onClick={(e) => handleSave(item.id, e)} loading={saving[item.id]} disabled={saving[item.id]}>
                      <Bookmark size={12} /> {saving[item.id] ? 'Saving...' : 'Save'}
                    </Button>
                  </motion.span>
                )}
                {saved[item.id] && (
                  <motion.span whileTap={{ scale: 0.93 }}>
                    <Button variant="ghost" size="sm">
                      <ChevronRight size={12} /> View
                    </Button>
                  </motion.span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textTertiary }}>
          <GraduationCap size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
          <p style={{ fontSize: t.size.md, margin: 0 }}>No scholarships found.</p>
        </div>
      )}

      <Button style={{ width: '100%', marginTop: 20, fontFamily: DISP, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <Plus size={16} /> Add School
      </Button>
    </div>
  );
};
