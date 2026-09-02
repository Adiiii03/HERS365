import React, { useEffect, useState } from 'react';
import { colors, type as t, radii } from '../lib/tokens';
import { UpgradeGate } from '../components/UpgradeGate';
import { TrendingUp } from 'lucide-react';

export const Analytics = () => {
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/analytics/performance', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStats(data);
      });
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: t.font.display, fontSize: t.size['3xl'], fontWeight: 800, textTransform: 'uppercase', margin: '0 0 8px' }}>
          Performance Analytics
        </h1>
        <p style={{ color: colors.textSecondary, margin: 0 }}>Track your growth and compare stats against the platform average.</p>
      </div>

      <UpgradeGate requiredTier="pro" feature="Performance Analytics">
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: 40, textAlign: 'center', color: colors.textTertiary }}>
          <TrendingUp size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Analytics Dashboard Under Construction.</p>
          <p style={{ fontSize: t.size.sm }}>Once you log game or combine stats, charts will appear here.</p>
        </div>
      </UpgradeGate>
    </div>
  );
};
