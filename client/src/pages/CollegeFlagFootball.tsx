import { Trophy, GraduationCap, Star, ArrowRight } from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';
import { Card } from '../components/ui';

const DISP = t.font.display;

const COLLEGES = [
  { name: 'Eastern Michigan University', div: 'NAIA', state: 'MI', status: 'Established', note: 'First college women\'s flag football program, 2020' },
  { name: 'Southeastern University', div: 'NAIA', state: 'FL', status: 'Established', note: 'Championship program, national exposure' },
  { name: 'Indiana Wesleyan University', div: 'NAIA', state: 'IN', status: 'Established', note: 'Growing roster, athletic scholarships available' },
  { name: 'Bethune-Cookman University', div: 'HBCU', state: 'FL', status: 'Expanding', note: 'HBCU pioneer in women\'s flag football' },
  { name: 'University of California', div: 'Club/D1', state: 'CA', status: 'Club', note: 'Active club program, D1 path anticipated' },
  { name: 'Florida A&M University', div: 'HBCU', state: 'FL', status: 'Established', note: 'Varsity program with national tournament bids' },
];

const STATS = [
  { label: 'Varsity Programs', val: '40+' },
  { label: 'States with Programs', val: '22' },
  { label: 'Scholarships Available', val: '150+' },
  { label: 'Projected Growth (5yr)', val: '3×' },
];

const DIV_COLOR: Record<string, string> = {
  NAIA: colors.accent,
  HBCU: colors.pink,
};

export const CollegeFlagFootball = () => (
  <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accentText }}>
        <GraduationCap size={13} /> COLLEGE PROGRAMS
      </div>
      <h1 style={{ fontFamily: DISP, fontSize: t.size['3xl'], fontWeight: 900, textTransform: 'uppercase', letterSpacing: t.tracking.h2, margin: '0 0 10px', lineHeight: 1 }}>College Flag Football.</h1>
      <p style={{ color: colors.textSecondary, fontSize: t.size.md, maxWidth: 520, lineHeight: 1.65 }}>Women's flag football is the fastest-growing college sport in America. Here's where the opportunities are — and where they're headed.</p>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 36 }}>
      {STATS.map((s) => (
        <Card key={s.label} style={{ padding: '16px 14px', textAlign: 'center' }}>
          <div style={{ fontFamily: DISP, fontSize: t.size['2xl'], fontWeight: 900, color: colors.accentText, lineHeight: 1 }}>{s.val}</div>
          <div style={{ fontSize: t.size.xs, color: colors.textSecondary, fontWeight: t.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 5 }}>{s.label}</div>
        </Card>
      ))}
    </div>

    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Trophy size={16} color={colors.accent} />
        <span style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold, textTransform: 'uppercase' }}>Active Programs</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {COLLEGES.map((c) => {
          const divColor = DIV_COLOR[c.div] ?? colors.accentText;
          return (
            <Card key={c.name} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: t.weight.bold, fontSize: t.size.md, color: colors.textPrimary, marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{c.note}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <span style={{ padding: '2px 8px', background: `${divColor}15`, border: `1px solid ${divColor}30`, borderRadius: radii.full, fontSize: t.size.xs, fontWeight: t.weight.bold, color: divColor }}>{c.div}</span>
                <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{c.state} · {c.status}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>

    <div style={{ background: `${colors.accent}10`, border: `1px solid ${colors.accent}30`, borderRadius: radii.lg, padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, cursor: 'pointer' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Star size={14} color={colors.accent} />
          <span style={{ fontFamily: DISP, fontSize: t.size.md, fontWeight: t.weight.bold, textTransform: 'uppercase' }}>Use the College Fit Calculator</span>
        </div>
        <p style={{ color: colors.textSecondary, fontSize: t.size.base, margin: 0 }}>Enter your GPA and HERS Rating to see which programs match your profile.</p>
      </div>
      <ArrowRight size={18} color={colors.accent} />
    </div>
  </div>
);
