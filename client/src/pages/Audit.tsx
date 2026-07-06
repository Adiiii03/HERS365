import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertCircle, Clock, DollarSign, Eye } from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';
import { Card, Badge } from '../components/ui';

const DISP = t.font.display;

const nilDeals = [
  { id: 1, brand: 'Under Armour',   type: 'Apparel',     value: '$2,400/yr',  status: 'approved', date: '2025-03-15', disclosure: true  },
  { id: 2, brand: 'Gatorade',       type: 'Endorsement', value: '$800/yr',    status: 'approved', date: '2025-04-02', disclosure: true  },
  { id: 3, brand: 'QB Elite Camp',  type: 'Appearance',  value: '$300 flat',  status: 'pending',  date: '2025-05-20', disclosure: false },
  { id: 4, brand: 'GameTime App',   type: 'Social Media', value: '$150/post', status: 'review',   date: '2025-05-25', disclosure: true  },
];

const requirements = [
  { label: 'School notification filed',       done: true  },
  { label: 'State association disclosure',    done: true  },
  { label: 'GPA eligibility maintained (3.9)', done: true  },
  { label: 'Academic certification current',  done: true  },
  { label: 'QB Elite Camp contract reviewed', done: false },
  { label: 'GameTime App FTC disclosure tag', done: false },
];

type StatusTone = 'success' | 'pink' | 'accent' | 'danger';

const statusConfig: Record<string, { tone: StatusTone; label: string }> = {
  approved: { tone: 'success', label: 'Approved' },
  pending:  { tone: 'pink',    label: 'Pending'  },
  review:   { tone: 'accent',  label: 'Review'   },
  rejected: { tone: 'danger',  label: 'Rejected' },
};

export const Audit = () => {
  const [activeTab, setActiveTab] = useState<'nil' | 'checklist'>('nil');

  const approvedCount  = nilDeals.filter(d => d.status === 'approved').length;
  const pendingCount   = nilDeals.filter(d => d.status === 'pending').length;
  const reviewCount    = nilDeals.filter(d => d.status === 'review').length;
  const doneCount      = requirements.filter(r => r.done).length;
  const compliancePct  = Math.round((doneCount / requirements.length) * 100);

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size['2xl'], textTransform: 'uppercase', color: colors.textPrimary, marginBottom: 4 }}>
          NIL Compliance
        </h1>
        <p style={{ color: colors.textTertiary, fontSize: t.size.base }}>Track your Name, Image & Likeness deals and eligibility status</p>
      </div>

      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'COMPLIANCE',  value: `${compliancePct}%`,   sub: `${doneCount}/${requirements.length} items`, icon: Shield,     accent: compliancePct === 100 ? colors.success : colors.accent },
          { label: 'ACTIVE DEALS', value: approvedCount,         sub: 'Approved',                                 icon: CheckCircle2, accent: colors.success },
          { label: 'PENDING',     value: pendingCount,           sub: 'Needs action',                             icon: Clock,      accent: colors.pink },
          { label: 'UNDER REVIEW', value: reviewCount,           sub: 'In progress',                              icon: Eye,        accent: colors.accent },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.6rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary }}>{label}</span>
                <Icon size={14} color={accent} />
              </div>
              <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size['2xl'], color: accent, lineHeight: 1, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{sub}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Compliance bar */}
      <Card style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: t.size.sm, fontWeight: t.weight.semibold, color: colors.textSecondary }}>Overall Compliance Score</span>
          <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.md, color: compliancePct >= 80 ? colors.success : colors.accent }}>{compliancePct}%</span>
        </div>
        <div className="k-progress-track" style={{ height: 8 }}>
          <div className="k-progress-fill" style={{ width: `${compliancePct}%`, background: compliancePct >= 80 ? colors.success : colors.accent }} />
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['nil', 'checklist'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? colors.accent : 'transparent',
            border: '1px solid',
            borderColor: activeTab === tab ? colors.accent : 'rgba(255,255,255,0.08)',
            borderRadius: radii.sm, padding: '7px 16px',
            color: activeTab === tab ? colors.accentOn : colors.textTertiary,
            fontSize: t.size.sm, fontWeight: t.weight.bold, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {tab === 'nil' ? 'NIL Deals' : 'Checklist'}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

        {activeTab === 'nil' && (
          <Card style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 90px',
              padding: '10px 16px', borderBottom: `1px solid ${colors.border}`,
            }}>
              {['BRAND / TYPE', 'VALUE', 'STATUS', 'DATE', 'DISCLOSE'].map(h => (
                <div key={h} style={{ fontSize: '0.6rem', fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary }}>{h}</div>
              ))}
            </div>
            {nilDeals.map((deal, i) => {
              const s = statusConfig[deal.status];
              return (
                <motion.div key={deal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 90px',
                    padding: '13px 16px', alignItems: 'center',
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: radii.sm, background: colors.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={14} color={colors.accent} />
                      </div>
                      <div>
                        <div style={{ fontSize: t.size.base, fontWeight: t.weight.semibold, color: colors.textSecondary }}>{deal.brand}</div>
                        <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{deal.type}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: t.size.base, fontWeight: t.weight.semibold, color: colors.textSecondary }}>{deal.value}</div>
                  <div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{deal.date}</div>
                  <div>
                    {deal.disclosure
                      ? <CheckCircle2 size={15} color={colors.success} fill={colors.success} />
                      : <AlertCircle size={15} color={colors.pink} />
                    }
                  </div>
                </motion.div>
              );
            })}
          </Card>
        )}

        {activeTab === 'checklist' && (
          <Card style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 16 }}>Compliance Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {requirements.map((req, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
                  {req.done
                    ? <CheckCircle2 size={16} color={colors.success} fill={colors.success} style={{ flexShrink: 0 }} />
                    : <AlertCircle  size={16} color={colors.pink} style={{ flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: t.size.base, color: req.done ? colors.textTertiary : colors.textSecondary, fontWeight: t.weight.medium, textDecoration: req.done ? 'line-through' : 'none' }}>{req.label}</span>
                  {!req.done && (
                    <span style={{ marginLeft: 'auto' }}>
                      <Badge tone="pink">ACTION NEEDED</Badge>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

      </motion.div>
    </div>
  );
};
