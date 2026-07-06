import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colors, type as t, radii } from '../lib/tokens';

const LINE = 'rgba(255,255,255,0.07)';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.user?.role !== 'admin' && data.user?.role !== 'staff') {
        setError('Access denied. Admin credentials required.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/admin');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.surface0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(139,59,255,0.08)', border: '1.5px solid rgba(139,59,255,0.31)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={22} color={colors.accent} />
          </div>
          <h1 style={{ fontFamily: t.font.display, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Admin Access</h1>
          <p style={{ color: colors.textSecondary, fontSize: '0.82rem', margin: 0 }}>HERS365 Internal Portal</p>
        </div>
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: radii.lg, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: 'rgba(255,90,90,0.1)', border: '1px solid rgba(255,90,90,0.3)', borderRadius: radii.sm, padding: '10px 14px', fontSize: '0.8rem', color: colors.dangerText }}>{error}</div>}
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 7 }}>Email</div>
            <input className="k-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@hers365.com" required style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 7 }}>Password</div>
            <input className="k-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={loading} style={{ padding: '13px', background: colors.accent, color: colors.accentOn, border: 'none', borderRadius: radii.md, fontSize: '0.88rem', fontFamily: t.font.display, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Lock size={15} />{loading ? 'Signing in…' : 'Sign In'}
          </motion.button>
        </form>
      </div>
    </div>
  );
};
