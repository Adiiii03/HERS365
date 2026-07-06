import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, errorMessage } from '../lib/api';
import { Button } from '../components/ui';
import { colors, type as t, radii } from '../lib/tokens';
import { easing } from '../lib/motion';

const FIELD = 'rgba(255,255,255,0.02)';
const LINE  = 'rgba(255,255,255,0.08)';

const EASE = easing.standard as [number, number, number, number];

export function ForgotPassword() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [focused,   setFocused]   = useState(false);
  const navigate = useNavigate();
  const reduced  = !!useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/email/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong — please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: colors.surface0,
      color: colors.textPrimary, fontFamily: t.font.body, overflowX: 'hidden',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Ambient orbs */}
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
        {/* Logo */}
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
            {!submitted ? (
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
                  Forgot Password
                </h1>
                <p style={{ color: colors.textSecondary, fontSize: '.9rem', margin: '0 0 32px', lineHeight: 1.5 }}>
                  Enter your account email and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ marginBottom: 20 }}>
                    <label
                      htmlFor="fp-email"
                      style={{
                        display: 'block', fontFamily: t.font.display, fontWeight: 700,
                        fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase',
                        color: focused ? colors.accent : colors.textSecondary, marginBottom: 9, transition: 'color .2s',
                      }}
                    >
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={16}
                        aria-hidden
                        style={{
                          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                          color: focused ? colors.accent : colors.textTertiary, transition: 'color .2s', pointerEvents: 'none',
                        }}
                      />
                      <input
                        id="fp-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="you@example.com"
                        style={{
                          width: '100%', background: FIELD,
                          border: `1px solid ${focused ? 'rgba(139,59,255,0.5)' : LINE}`,
                          borderRadius: radii.md,
                          outline: focused ? '2px solid rgba(139,59,255,0.9)' : 'none',
                          outlineOffset: 2,
                          padding: '15px 16px 15px 44px',
                          fontSize: '1rem', color: colors.textPrimary, fontFamily: t.font.body,
                          boxShadow: focused ? '0 0 0 3px rgba(139,59,255,0.08)' : 'none',
                          transition: 'border-color .2s, box-shadow .2s',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

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
                    style={{
                      width: '100%',
                      fontFamily: t.font.display, fontWeight: 900, fontSize: '1.05rem',
                      letterSpacing: '.08em', textTransform: 'uppercase',
                    }}
                  >
                    Send Reset Link
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="confirmation"
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
                  Check Your Inbox
                </h2>
                <p style={{ color: colors.textSecondary, fontSize: '.9rem', lineHeight: 1.6, margin: '0 0 8px' }}>
                  If an account exists for <strong style={{ color: colors.textPrimary }}>{email}</strong>, we sent a reset link to that address.
                </p>
                <p style={{ color: colors.textTertiary, fontSize: '.8rem', lineHeight: 1.5, margin: 0 }}>
                  Didn't get it? Check your spam folder. The link expires in 1 hour.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to Sign In */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${LINE}` }}>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', color: colors.textSecondary,
                fontFamily: t.font.display, fontWeight: 700, fontSize: '.78rem',
                letterSpacing: '.12em', textTransform: 'uppercase',
                cursor: 'pointer', padding: 0, transition: 'color .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = colors.accent)}
              onMouseLeave={e => (e.currentTarget.style.color = colors.textSecondary)}
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
