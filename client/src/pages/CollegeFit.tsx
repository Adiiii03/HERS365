import React, { useEffect, useState } from 'react';
import { colors, type as t, radii } from '../lib/tokens';
import { UpgradeGate } from '../components/UpgradeGate';
import { Target, MapPin } from 'lucide-react';

export const CollegeFit = () => {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/college-fit', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMatches(data);
      });
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: t.font.display, fontSize: t.size['3xl'], fontWeight: 800, textTransform: 'uppercase', margin: '0 0 8px' }}>
          College Fit Matches
        </h1>
        <p style={{ color: colors.textSecondary, margin: 0 }}>Discover college programs that match your profile.</p>
      </div>

      <UpgradeGate requiredTier="pro" feature="College Fit Tool">
        <div style={{ display: 'grid', gap: 16 }}>
          {matches.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: colors.textTertiary, background: 'rgba(255,255,255,0.03)', borderRadius: radii.lg }}>
              Calculating your matches...
            </div>
          ) : (
            matches.map((team, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: t.font.display, fontSize: t.size.lg, fontWeight: 800 }}>{team.name}</div>
                  <div style={{ color: colors.textSecondary, fontSize: t.size.sm, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <MapPin size={12} /> {team.city}, {team.state} · {team.division}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: t.font.display, fontSize: t.size.xl, fontWeight: 800, color: colors.accent }}>
                    {team.matchScore}%
                  </div>
                  <div style={{ fontSize: t.size.xs, color: colors.textTertiary, textTransform: 'uppercase' }}>Match Score</div>
                </div>
              </div>
            ))
          )}
        </div>
      </UpgradeGate>
    </div>
  );
};
