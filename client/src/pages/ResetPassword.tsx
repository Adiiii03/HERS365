import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, errorMessage } from '../lib/api';
import { Button } from '../components/ui';
import { colors, type as t, radii } from '../lib/tokens';
import { easing } from '../lib/motion';

const FIELD = 'rgba(255,255,255,0.02)';
const LINE  = 'rgba(255,255,255,0.08)';

const EASE = easing.standard as [number, number, number, number];

export function ResetPassword() {
  const [searchParams]   = useSearchParams();
  const token            = searchParams.get('token') || '';
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');
  const [focused,   setFocused]   = useState<'pw' | 'cf' | null>(null);
  const [showPw,    setShowPw]    = useState(false);
  const [showCf,    setShowCf]    = useState(false);
  const navigate = useNavigate();
  const reduced  = !!useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Reset link is missing or invalid. Request a new one.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/email/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Reset failed — the link may have expired. Request a new one.'));
    } finally {
      setLoading(false);
    }
  };

  const pwField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    focusKey: 'pw' | 'cf',
    show: boolean,
    onToggle: () => void
  ) => (
    <div style={{ marginBottom: 20 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block', fontFamily: t.font.display, fontWeight: 700,
          fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase',
          color: focused === focusKey ? colors.accent : colors.textSecondary, marginBottom: 9, transition: 'color .2s',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Lock
          size={16}
          aria-hidden
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: focused === focusKey ? colors.accent : colors.textTertiary, transition: 'color .2s', pointerEvents: 'none',
          }}
        />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          autoComplete="new-password"
          onFocus={() => setFocused(focusKey)}
          onBlur={() => setFocused(null)}
          style={{
            width: '100%', background: FIELD,
            border: `1px solid ${focused === focusKey ? 'rgba(139,59,255,0.5)' : LINE}`,
            borderRadius: radii.md,
            outline: focused === focusKey ? '2px solid rgba(139,59,255,0.9)' : 'none',
            outlineOffset: 2,
            padding: '15px 46px 15px 44px',
            fontSize: '1rem', color: colors.textPrimary, fontFamily: t.font.body,
            boxShadow: focused === focusKey ? '0 0 0 3px rgba(139,59,255,0.08)' : 'none',
            transition: 'border-color .2s, box-shadow .2s',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer',
            padding: 10, minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color .2s', borderRadius: radii.sm,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = colors.accentText)}
          onMouseLeave={e => (e.currentTarget.style.color = colors.textSecondary)}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: colors.surface0,
      color: colors.textPrimary, fontFamily: t.font.body, overflowX: 'hidden',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className={reduced ? '' : 'auth-orb auth-orb-a'} style={{
          position: 'absolute', width: 560, height: 560, borderRadius: '50%',
          filter: 'blur(120px)', opacity: 0.13, bottom: '-26%', left: '-16%',
          background: `radial-gradient(circle, ${colors.accent}, transparent 62%)`,
          willChange: 'transform, opacity',
        }} />
        <div className={reduced ? '' : 'auth-orb auth-orb-b'} style={{
          position: 'absolute', width: 380, height: 380, borderRadius: '50%',
          filter: 'blur(110px)', opacity: 0.08, top: '-18%', right: '-12%',
          background: `radial-gradient(circle, ${colors.accentText}, transparent 64%)`,
          willChange: 'transform, opacity',
        }} />
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          margin: '0 auto', padding: '0 24px',
        }}
      >
        <motion.button
          type="button"
          onClick={() => navigate('/')}
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{
            fontFamily: t.font.display, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.03em',
            textTransform: 'uppercase', cursor: 'pointer', background: 'none', border: 'none',
            color: colors.textPrimary, padding: 0, marginBottom: 40, display: 'block',
          }}
        >
          HERS<span style={{ color: colors.accent }}>365</span>
        </motion.button>

        <div style={{
          background: colors.surface1, border: `1px solid ${LINE}`,
          borderRadius: radii.lg, padding: '40px 36px',
        }}>
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <h1 style={{
                  fontFamily: t.font.display, fontWeight: 900, fontSize: '1.8rem',
                  letterSpacing: '.02em', textTransform: 'uppercase',
                  margin: '0 0 8px', color: colors.textPrimary,
                }}>
                  New Password
                </h1>
                <p style={{ color: colors.textSecondary, fontSize: '.9rem', margin: '0 0 32px', lineHeight: 1.5 }}>
                  Choose a strong password — at least 8 characters.
                </p>

                {!token && (
                  <p style={{
                    color: colors.dangerText, fontSize: '.84rem', margin: '0 0 20px',
                    fontWeight: 600, padding: '11px 14px', borderRadius: 10,
                    background: 'rgba(139,59,255,0.08)', border: '1px solid rgba(139,59,255,0.2)',
                  }}>
                    This reset link is invalid. <button type="button" onClick={() => navigate('/forgot-password')} style={{ color: colors.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline' }}>Request a new one.</button>
                  </p>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  {pwField('rp-password', 'New Password', password, setPassword, 'pw', showPw, () => setShowPw(p => !p))}
                  {pwField('rp-confirm', 'Confirm Password', confirm, setConfirm, 'cf', showCf, () => setShowCf(p => !p))}

                  <p style={{ color: colors.textSecondary, fontSize: '.72rem', margin: '-8px 0 16px', fontFamily: t.font.body, lineHeight: 1.4 }}>
                    At least 8 characters.
                  </p>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        role="alert"
                        aria-live="assertive"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                          color: colors.dangerText, fontSize: '.84rem', margin: '0 0 16px',
                          fontWeight: 600, padding: '11px 14px', borderRadius: 10,
                          background: 'rgba(139,59,255,0.08)', border: '1px solid rgba(139,59,255,0.2)',
                        }}
                      >{error}</motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    size="lg"
                    loading={loading}
                    disabled={!token}
                    style={{
                      width: '100%',
                      fontFamily: t.font.display, fontWeight: 900, fontSize: '1.05rem',
                      letterSpacing: '.08em', textTransform: 'uppercase',
                    }}
                  >
                    Set New Password
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(139,59,255,0.12)', border: `1px solid rgba(139,59,255,0.25)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px',
                }}>
                  <CheckCircle size={26} color={colors.accent} />
                </div>
                <h2 style={{
                  fontFamily: t.font.display, fontWeight: 900, fontSize: '1.6rem',
                  letterSpacing: '.02em', textTransform: 'uppercase',
                  margin: '0 0 12px', color: colors.textPrimary,
                }}>
                  Password Updated
                </h2>
                <p style={{ color: colors.textSecondary, fontSize: '.9rem', lineHeight: 1.6, margin: '0 0 28px' }}>
                  You're all set. Sign in with your new password.
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => navigate('/auth')}
                  style={{
                    fontFamily: t.font.display, fontWeight: 900, fontSize: '1rem',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}
                >
                  Sign In
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
