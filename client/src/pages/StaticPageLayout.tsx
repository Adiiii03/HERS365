import React from 'react';
import { tokens } from '../lib/tokens';

const { colors, text, type, radii } = tokens;

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
};

export const StaticPageLayout = ({ title, subtitle, badge, children }: Props) => (
  <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 32 }}>
      {badge && (
        <div style={{ fontSize: '0.65rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent, marginBottom: 6 }}>{badge}</div>
      )}
      <h1 style={{ fontFamily: type.font.display, fontSize: '2.2rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>{title}</h1>
      {subtitle && <p style={{ color: text.secondary, fontSize: '0.82rem', margin: 0 }}>{subtitle}</p>}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {children}
    </div>
  </div>
);

export const StaticSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: '18px 22px' }}>
    <h3 style={{ fontFamily: type.font.display, fontSize: '1rem', fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 8px', color: text.primary }}>{title}</h3>
    <div style={{ color: text.secondary, fontSize: '0.85rem', lineHeight: 1.65 }}>{children}</div>
  </div>
);
