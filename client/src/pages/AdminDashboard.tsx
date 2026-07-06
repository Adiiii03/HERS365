import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Clock, CreditCard, BarChart2, AlertTriangle } from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';

const LINE = 'rgba(255,255,255,0.07)';

type Stats = {
  totalAthletes: number;
  totalCoaches: number;
  pendingVerifications: number;
  messagesToday: number;
  newSignupsThisWeek: number;
  activeSubscriptions: number;
};

type Signup = {
  id: number;
  name: string;
  position: string | null;
  state: string | null;
  createdAt: string | null;
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') ?? '';
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/data/stats', { headers }).then((r) => r.json()),
      fetch('/api/admin/data/recent-signups', { headers }).then((r) => r.json()),
    ])
      .then(([statsRes, signupsRes]) => {
        if (statsRes.success) setStats(statsRes.data);
        else setError('Failed to load stats');
        if (signupsRes.success) setSignups(signupsRes.data);
      })
      .catch(() => setError('Network error'));
  }, []);

  const cards = stats
    ? [
        {
          label: 'Total Athletes',
          val: stats.totalAthletes,
          icon: <Users size={18} />,
          color: colors.accent,
          border: LINE,
        },
        {
          label: 'Total Coaches',
          val: stats.totalCoaches,
          icon: <Shield size={18} />,
          color: colors.accentText,
          border: LINE,
        },
        {
          label: 'Pending Verifications',
          val: stats.pendingVerifications,
          icon: <Clock size={18} />,
          color: stats.pendingVerifications > 0 ? colors.pink : colors.textSecondary,
          border: stats.pendingVerifications > 0 ? `1px solid ${colors.pink}` : `1px solid ${LINE}`,
        },
        {
          label: 'Active Subscriptions',
          val: stats.activeSubscriptions,
          icon: <CreditCard size={18} />,
          color: colors.success,
          border: LINE,
        },
      ]
    : [];

  const formatDate = (raw: string | null) => {
    if (!raw) return 'Unknown';
    try {
      return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return raw;
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: colors.accent,
          }}
        >
          <BarChart2 size={13} /> ADMIN DASHBOARD
        </div>
        <h1
          style={{
            fontFamily: t.font.display,
            fontSize: '2.2rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1,
          }}
        >
          Platform Overview
        </h1>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(255,90,90,0.08)',
            border: '1px solid rgba(255,90,90,0.25)',
            borderRadius: radii.sm,
            padding: '12px 16px',
            color: colors.dangerText,
            fontSize: '0.82rem',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {!stats && !error && (
        <div style={{ color: colors.textTertiary, fontSize: '0.85rem', padding: '24px' }}>Loading stats...</div>
      )}

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 32,
          }}
        >
          {cards.map((c) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: colors.surface1,
                border: typeof c.border === 'string' && c.border.startsWith('1px') ? c.border : `1px solid ${c.border}`,
                borderRadius: radii.md,
                padding: '18px 16px',
              }}
            >
              <div style={{ color: c.color, marginBottom: 8 }}>{c.icon}</div>
              <div
                style={{
                  fontFamily: t.font.display,
                  fontSize: '2rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: colors.textPrimary,
                }}
              >
                {c.val.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: colors.textSecondary,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 4,
                }}
              >
                {c.label}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {signups.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: colors.textSecondary,
              marginBottom: 12,
            }}
          >
            Recent Signups
          </div>
          <div
            style={{
              background: colors.surface1,
              border: `1px solid ${LINE}`,
              borderRadius: radii.md,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                  {['Name', 'Position', 'State', 'Joined'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 16px',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: colors.textTertiary,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signups.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: i < signups.length - 1 ? `1px solid ${LINE}` : 'none',
                    }}
                  >
                    <td style={{ padding: '10px 16px', fontSize: '0.82rem', color: colors.textPrimary, fontWeight: 600 }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.78rem', color: colors.textSecondary }}>
                      {s.position ?? 'Unknown'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.78rem', color: colors.textSecondary }}>
                      {s.state ?? 'Unknown'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.75rem', color: colors.textTertiary }}>
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        style={{
          background: 'rgba(255,46,147,0.07)',
          border: '1px solid rgba(255,46,147,0.2)',
          borderRadius: radii.md,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 32,
        }}
      >
        <AlertTriangle size={15} color={colors.pink} />
        <span style={{ fontSize: '0.8rem', color: colors.pinkText }}>
          Admin actions are logged. All moderation decisions are auditable.
        </span>
      </div>
    </div>
  );
};
