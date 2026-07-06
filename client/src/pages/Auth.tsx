import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, ArrowUpRight, ShieldCheck, Users, Phone, HeartHandshake, RefreshCw } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DemoLoginButton } from '../components/DemoLoginButton';
import { Capacitor } from '@capacitor/core';
import { Button } from '../components/ui';
import { colors, type as t, radii } from '../lib/tokens';
import { easing } from '../lib/motion';

const FIELD = 'rgba(255,255,255,0.02)';
const LINE  = 'rgba(255,255,255,0.08)';

const EASE = easing.standard as [number, number, number, number];

function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Field({
  id, label, type = 'text', value, onChange, required = false,
  icon: Icon, autoComplete, invalid, describedBy,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon: React.ElementType; autoComplete?: string;
  invalid?: boolean; describedBy?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const isPass    = type === 'password';
  const inputType = isPass && showPw ? 'text' : type;

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontFamily: t.font.display, fontWeight: 700, fontSize: '.7rem',
          letterSpacing: '.16em', textTransform: 'uppercase',
          color: focused ? colors.accent : colors.textSecondary, marginBottom: 9,
          transition: 'color .2s',
        }}
      >
        {label}
      </label>

      <div style={{ position: 'relative' }}>
        <Icon
          size={16}
          aria-hidden
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: focused ? colors.accent : colors.textTertiary, transition: 'color .2s', pointerEvents: 'none',
          }}
        />

        <input
          id={id}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', background: FIELD,
            border: `1px solid ${focused ? 'rgba(139,59,255,0.5)' : LINE}`,
            borderRadius: radii.md,
            outline: focused ? '2px solid rgba(139,59,255,0.9)' : 'none',
            outlineOffset: 2,
            padding: isPass ? '15px 46px 15px 44px' : '15px 16px 15px 44px',
            fontSize: '1rem', color: colors.textPrimary, fontFamily: t.font.body,
            boxShadow: focused ? '0 0 0 3px rgba(139,59,255,0.08)' : 'none',
            transition: 'border-color .2s, box-shadow .2s',
          }}
        />

        {isPass && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
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
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

// Subtle ambient flame motion — GPU-friendly transforms only (translate/opacity/scale).
// Fully static under prefers-reduced-motion. `faint` dials it down behind the mobile form.
function AmbientField({ reduced, faint = false }: { reduced: boolean; faint?: boolean }) {
  const k = faint ? 0.45 : 1;
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className={reduced ? '' : 'auth-orb auth-orb-a'} style={{
        position: 'absolute', width: 560, height: 560, borderRadius: '50%',
        filter: 'blur(120px)', opacity: 0.16 * k, bottom: '-26%', left: '-16%',
        background: `radial-gradient(circle, ${colors.accent}, transparent 62%)`,
        willChange: 'transform, opacity',
      }} />
      <div className={reduced ? '' : 'auth-orb auth-orb-b'} style={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%',
        filter: 'blur(110px)', opacity: 0.1 * k, top: '-18%', right: '-12%',
        background: `radial-gradient(circle, ${colors.accentText}, transparent 64%)`,
        willChange: 'transform, opacity',
      }} />
    </div>
  );
}

type SignupRole = 'athlete' | 'parent';

export const Auth = () => {
  // GoogleLogin renders the Google Identity Services iframe widget which
  // does not work inside WKWebView without native auth plumbing. Hide it on
  // native; email/password and the OAuth-callback path still work.
  const isNativePlatform = Capacitor.isNativePlatform();
  // Build-time kill switch (default: closed). When registration is off we render
  // a login-only page and never default into signup — the server enforces the
  // same gate, so this is UX, not the security boundary.
  const registrationEnabled = import.meta.env.VITE_REGISTRATION_ENABLED === 'true';
  const [searchParams] = useSearchParams();
  const [isLogin,  setIsLogin]  = useState(registrationEnabled ? searchParams.get('tab') !== 'signup' : true);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  // New signup-only fields. DOB is required for athletes so the backend can
  // enforce COPPA and parent-gate rules. Parent email is required for athletes
  // under 18 (it's who coach contact gets routed through); 18+ may omit it.
  const [role,        setRole]        = useState<SignupRole>(
    registrationEnabled && (searchParams.get('role') as SignupRole | null) === 'parent' ? 'parent' : 'athlete',
  );
  const [dob,           setDob]           = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  // Guardian gate: a 202 from register/google means the account exists but is
  // locked until the guardian approves. We hold the pending token (also in
  // localStorage via AuthContext) and show the waiting screen instead of the form.
  const [guardianMasked, setGuardianMasked] = useState(() => localStorage.getItem('guardianEmailMasked') || '');
  const [pendingNote,    setPendingNote]    = useState('');
  const [resendWait,     setResendWait]     = useState(0);
  const [activatedNote,  setActivatedNote]  = useState('');
  // Set when Google signup bounced with GUARDIAN_EMAIL_REQUIRED — we keep the
  // credential and retry once the guardian email is filled in.
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const navigate  = useNavigate();
  const { login, pendingToken, setPending, clearPending } = useAuth();
  const reduced   = !!useReducedMotion();
  const showPendingScreen = !!pendingToken;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enterPending = (data: { pendingToken: string; guardianEmailMasked?: string }) => {
    if (data.guardianEmailMasked) {
      localStorage.setItem('guardianEmailMasked', data.guardianEmailMasked);
      setGuardianMasked(data.guardianEmailMasked);
    }
    setPending(data.pendingToken);
  };

  const finishPending = () => {
    localStorage.removeItem('guardianEmailMasked');
    clearPending();
    setIsLogin(true);
    setActivatedNote('Your grown up said yes! Your account is ready — sign in below.');
  };

  const checkGuardianStatus = async (manual = false) => {
    if (!pendingToken) return;
    try {
      const res = await fetch(`/api/auth/guardian/status?pendingToken=${encodeURIComponent(pendingToken)}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === 'active') {
        finishPending();
      } else if (manual) {
        setPendingNote("Not yet! We'll keep watching — hang tight.");
      }
    } catch {
      if (manual) setPendingNote("We couldn't check right now — try again in a moment.");
    }
  };

  useEffect(() => {
    if (!pendingToken) return;
    pollRef.current = setInterval(() => { checkGuardianStatus(); }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToken]);

  useEffect(() => {
    if (resendWait <= 0) return;
    const t = setTimeout(() => setResendWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);

  const handleResend = async () => {
    if (!pendingToken || resendWait > 0) return;
    setPendingNote('');
    try {
      const res = await fetch('/api/auth/guardian/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 429 && data?.retryAfterSeconds) {
        setResendWait(data.retryAfterSeconds);
        setPendingNote('That email just went out — give it a minute before sending another.');
      } else if (res.ok) {
        setPendingNote('Sent! Ask your grown up to check their inbox.');
      } else {
        setPendingNote(data?.error || data?.message || "We couldn't resend right now — try again soon.");
      }
    } catch {
      setPendingNote("We couldn't resend right now — check your connection and try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side guard: athlete signups need a DOB, the user must be 13+, and
    // every athlete needs a guardian email that isn't their own address.
    // Server enforces the same; this just avoids a round trip.
    if (!isLogin && role === 'athlete') {
      if (!dob) {
        setError('Date of birth is required.');
        return;
      }
      const ageYears = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (Number.isNaN(ageYears) || ageYears < 13) {
        setError('Athletes must be at least 13. A parent can set up a managed account.');
        return;
      }
      if (!guardianEmail.trim()) {
        setError("We need a parent or guardian's email to finish setting up your account.");
        return;
      }
      if (guardianEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
        setError("Your guardian's email has to be different from your own — use your grown up's address.");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { email, password };
      if (!isLogin && name) body.name = name;
      if (!isLogin) {
        body.role = role;
        if (role === 'athlete') {
          body.dob = dob;
          body.guardianEmail = guardianEmail.trim();
          if (guardianPhone.trim()) body.guardianPhone = guardianPhone.trim();
        }
      }
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (isLogin && res.status === 403 && data?.code === 'GUARDIAN_PENDING') {
          setError(
            "This account is waiting on a grown up's OK. We sent your parent or guardian an email — once they approve, you can sign in."
          );
          return;
        }
        setError(
          data?.error || data?.message ||
          (isLogin
            ? "We couldn't sign you in — check your email and password."
            : "We couldn't create your account — please try again.")
        );
        return;
      }
      if (res.status === 202 && data?.status === 'pending_guardian' && data?.pendingToken) {
        enterPending(data);
        return;
      }
      if (data?.token && data?.user) login(data.token, data.user);
      navigate(isLogin
        ? '/feed'
        : role === 'parent' ? '/parent/dashboard' : '/onboarding'
      );
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const submitGoogle = async (credential: string, withGuardianEmail?: string) => {
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { credential, role: 'athlete' };
      if (withGuardianEmail) body.guardianEmail = withGuardianEmail;
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.code === 'GUARDIAN_EMAIL_REQUIRED') {
        // New athlete via Google — hold the credential and ask for the
        // guardian email, then retry the same call with it attached.
        setGoogleCredential(credential);
        setIsLogin(false);
        setRole('athlete');
        return;
      }
      if (!res.ok) {
        if (res.status === 403 && data?.code === 'GUARDIAN_PENDING') {
          setError("This account is waiting on a grown up's OK. Once your parent or guardian approves, you can sign in.");
          return;
        }
        setError(data?.error || data?.message || 'Google sign-in failed — please try again.');
        return;
      }
      if (res.status === 202 && data?.status === 'pending_guardian' && data?.pendingToken) {
        setGoogleCredential(null);
        enterPending(data);
        return;
      }
      if (data?.token && data?.user) {
        login(data.token, data.user);
        navigate('/feed');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed — no credential returned.');
      return;
    }
    await submitGoogle(credentialResponse.credential);
  };

  const handleGoogleGuardianRetry = async () => {
    if (!googleCredential) return;
    if (!guardianEmail.trim()) {
      setError("We need a parent or guardian's email to finish setting up your account.");
      return;
    }
    await submitGoogle(googleCredential, guardianEmail.trim());
  };

  return (
    <div className="auth-root" style={{ display: 'flex', minHeight: '100vh', background: colors.surface0, color: colors.textPrimary, fontFamily: t.font.body, overflowX: 'hidden' }}>

      {/* ── LEFT RAIL (desktop) ── */}
      <aside
        className="hidden lg:flex"
        style={{
          width: '44%', flexShrink: 0, position: 'relative',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: '56px 64px', borderRight: `1px solid ${LINE}`,
          background: colors.surface1, overflow: 'hidden',
        }}
      >
        {/* subtle drifting flame ambient (motion-safe) */}
        <AmbientField reduced={reduced} />

        {/* fine grid, fading to the right — the single texture */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
            backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`,
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(105deg,#000 0%,#000 30%,transparent 88%)',
            WebkitMaskImage: 'linear-gradient(105deg,#000 0%,#000 30%,transparent 88%)',
          }}
        />

        {/* Logo */}
        <motion.button
          type="button"
          onClick={() => navigate('/')}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{
            fontFamily: t.font.display, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '.03em',
            textTransform: 'uppercase', position: 'relative', zIndex: 1, cursor: 'pointer',
            background: 'none', border: 'none', color: colors.textPrimary, padding: 0, alignSelf: 'flex-start',
            display: 'flex', alignItems: 'center',
          }}
        >
          HERS<span style={{ color: colors.accent }}>365</span>
        </motion.button>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
          style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 30,
              padding: '6px 13px 6px 11px', borderRadius: radii.full,
              border: `1px solid ${LINE}`, background: 'rgba(255,255,255,0.02)',
              fontFamily: t.font.display, fontWeight: 700, fontSize: '.68rem',
              letterSpacing: '.16em', textTransform: 'uppercase', color: colors.textSecondary,
            }}
          >
            <span className={reduced ? '' : 'auth-live-ring'} style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent, boxShadow: `0 0 10px ${colors.accent}` }} />
            Girls Flag Football
          </div>

          <div
            role="heading"
            aria-level={2}
            style={{
              fontFamily: t.font.display, fontWeight: 900, fontSize: 'clamp(3rem,4.4vw,4.5rem)',
              textTransform: 'uppercase', lineHeight: 0.9, letterSpacing: 'var(--tracking-display)', margin: 0,
            }}
          >
            Her game.<br />Her people.<br />
            <span style={{ color: colors.accent }}>Her space.</span>
          </div>

          <p style={{ color: colors.textSecondary, fontSize: '1.05rem', lineHeight: 1.65, margin: '26px 0 0', maxWidth: 360 }}>
            The community built for girls flag football. Safe by design, parent approved, and moderated by real people.
          </p>

          {/* Trust line — honest, no invented numbers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 34 }}>
            <ShieldCheck size={20} aria-hidden style={{ color: colors.accent, flexShrink: 0 }} />
            <span style={{ color: colors.textSecondary, fontSize: '.9rem', lineHeight: 1.45 }}>
              Parent approved. Human moderated.
            </span>
          </div>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22,
            position: 'relative', zIndex: 1, paddingTop: 28, borderTop: `1px solid ${LINE}`,
          }}
        >
          {[
            { Icon: ShieldCheck, l: 'Parent approved', s: 'Coach contact is gated through a guardian' },
            { Icon: Users,       l: 'Human moderated', s: 'Real people keep the community safe' },
            { Icon: Lock,        l: 'Under 18 safe',   s: 'Built to protect younger athletes' },
          ].map(({ Icon, l, s }) => (
            <div key={l}>
              <Icon size={18} aria-hidden style={{ color: colors.accent, marginBottom: 9 }} />
              <div style={{ fontFamily: t.font.display, fontWeight: 800, fontSize: '.72rem', letterSpacing: '.14em', textTransform: 'uppercase', color: colors.textPrimary, lineHeight: 1.1 }}>{l}</div>
              <div style={{ fontSize: '.72rem', color: colors.textTertiary, marginTop: 6, lineHeight: 1.4 }}>{s}</div>
            </div>
          ))}
        </motion.div>
      </aside>

      {/* ── RIGHT PANEL (form) ── */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))', position: 'relative', background: colors.surface0, overflow: 'hidden' }}>
        {/* faint ambient behind the form so mobile (no left panel) isn't flat */}
        <div className="flex lg:hidden" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <AmbientField reduced={reduced} faint />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}
        >
          {/* Mobile logo */}
          <button
            type="button"
            className="flex lg:hidden"
            onClick={() => navigate('/')}
            style={{
              fontFamily: t.font.display, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.03em',
              textTransform: 'uppercase', marginBottom: 36, cursor: 'pointer',
              background: 'none', border: 'none', color: colors.textPrimary, padding: 0, alignItems: 'center',
            }}
          >
            HERS<span style={{ color: colors.accent }}>365</span>
          </button>

          {showPendingScreen ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <HeartHandshake size={40} aria-hidden style={{ color: colors.accent, marginBottom: 18 }} />
              <h1 style={{ fontFamily: t.font.display, fontWeight: 900, fontSize: 'clamp(2.2rem,5vw,2.8rem)', textTransform: 'uppercase', lineHeight: 0.95, margin: '0 0 12px', letterSpacing: 'var(--tracking-display)' }}>
                Waiting for your grown up to say yes
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '.95rem', lineHeight: 1.6, margin: '0 0 8px' }}>
                You're almost in! We sent an email to{' '}
                <strong style={{ color: colors.textPrimary }}>{guardianMasked || 'your parent or guardian'}</strong>{' '}
                with a special code. Once they approve, your account unlocks.
              </p>
              <p style={{ color: colors.textTertiary, fontSize: '.82rem', lineHeight: 1.55, margin: '0 0 24px' }}>
                Go tell them to check their inbox — we'll keep an eye out here and let you know the moment they say yes.
              </p>

              <AnimatePresence>
                {pendingNote && (
                  <motion.p
                    role="status"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      color: colors.textPrimary, fontSize: '.82rem', margin: '0 0 16px', fontWeight: 600,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`,
                    }}
                  >{pendingNote}</motion.p>
                )}
              </AnimatePresence>

              <Button
                type="button"
                size="lg"
                onClick={() => checkGuardianStatus(true)}
                className="w-full uppercase tracking-[.08em] mb-3"
                style={{ fontFamily: t.font.display, fontWeight: 900, fontSize: '1rem' }}
              >
                I think my grown up said yes <ArrowRight size={16} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleResend}
                disabled={resendWait > 0}
                className="w-full uppercase tracking-[.08em]"
                style={{ fontFamily: t.font.display, fontWeight: 800, fontSize: '.85rem', color: resendWait > 0 ? colors.textTertiary : colors.textPrimary }}
              >
                <RefreshCw size={14} />
                {resendWait > 0 ? `Send the email again (${resendWait}s)` : 'Send the email again'}
              </Button>

              <p style={{ color: colors.textTertiary, fontSize: '.72rem', marginTop: 22, lineHeight: 1.6 }}>
                Signed up with the wrong grown up email?{' '}
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem('guardianEmailMasked'); clearPending(); }}
                  style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '.72rem', cursor: 'pointer', fontFamily: t.font.body, textDecoration: 'underline', padding: 0 }}
                >
                  Start over
                </button>
              </p>
            </motion.div>
          ) : (
          <>
          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'l' : 's'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <h1 style={{ fontFamily: t.font.display, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,3rem)', textTransform: 'uppercase', lineHeight: 0.92, margin: '0 0 10px', letterSpacing: 'var(--tracking-display)' }}>
                {isLogin
                  ? 'Welcome back.'
                  : role === 'parent' ? 'Set up her safe space.' : 'Join the community.'}
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '0.98rem', margin: '0 0 32px', lineHeight: 1.5 }}>
                {isLogin
                  ? 'Sign back in to your community.'
                  : role === 'parent'
                    ? "Create and oversee your daughter's account. Coach contact is gated through you."
                    : 'Build your profile and connect with your flag football community, safely.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Mobile trust line — honest, no invented numbers */}
          <div
            className="flex lg:hidden"
            style={{ alignItems: 'center', gap: 9, marginBottom: 26 }}
          >
            <ShieldCheck size={17} aria-hidden style={{ color: colors.accent, flexShrink: 0 }} />
            <span style={{ color: colors.textSecondary, fontSize: '.8rem', lineHeight: 1.4 }}>
              Parent approved. Human moderated.
            </span>
          </div>

          <AnimatePresence>
            {activatedNote && isLogin && (
              <motion.p
                role="status"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  color: colors.successText, fontSize: '.84rem', margin: '0 0 20px', fontWeight: 600,
                  padding: '11px 14px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                }}
              >{activatedNote}</motion.p>
            )}
          </AnimatePresence>

          {/* Segmented toggle — hidden when registration is closed (login only) */}
          {registrationEnabled && (
          <div
            role="group"
            aria-label="Choose sign in or create account"
            style={{ position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 11, padding: 4, marginBottom: 30, border: `1px solid ${LINE}` }}
          >
            <motion.span
              aria-hidden
              animate={{ left: isLogin ? 4 : '50%' }}
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              style={{
                position: 'absolute', top: 4, bottom: 4, width: 'calc(50% - 4px)',
                background: colors.accent, borderRadius: radii.sm, boxShadow: '0 4px 16px rgba(139,59,255,.32)',
              }}
            />
            {[{ label: 'Sign In', val: true }, { label: 'Create Account', val: false }].map(({ label, val }) => (
              <button
                key={label}
                type="button"
                aria-pressed={isLogin === val}
                onClick={() => { setIsLogin(val); setError(''); }}
                style={{
                  position: 'relative', zIndex: 1, flex: 1, padding: '10px 0',
                  borderRadius: radii.sm, border: 'none', cursor: 'pointer', background: 'transparent',
                  color: isLogin === val ? colors.accentOn : colors.textSecondary,
                  fontFamily: t.font.display, fontWeight: 800, fontSize: '.82rem',
                  letterSpacing: '.1em', textTransform: 'uppercase', transition: 'color .25s',
                }}
              >{label}</button>
            ))}
          </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  {/* Role selector — athlete vs parent. Coaches sign up at /coach/signup. */}
                  <div role="tablist" aria-label="Account type" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
                    {(['athlete', 'parent'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="tab"
                        aria-selected={role === r}
                        onClick={() => setRole(r)}
                        style={{
                          padding: '12px 10px', borderRadius: 11,
                          border: `1.5px solid ${role === r ? colors.accent : LINE}`,
                          background: role === r ? 'rgba(139,59,255,0.12)' : FIELD,
                          color: role === r ? colors.textPrimary : colors.textSecondary,
                          fontFamily: t.font.display, fontWeight: 800, fontSize: '.78rem',
                          letterSpacing: '.16em', textTransform: 'uppercase',
                          cursor: 'pointer', transition: 'all .18s',
                        }}
                      >
                        {r === 'athlete' ? "I'm an Athlete" : "I'm a Parent"}
                      </button>
                    ))}
                  </div>
                  <Field id="auth-name" label="Full Name" icon={User} value={name} onChange={setName} autoComplete="name" />
                </motion.div>
              )}
            </AnimatePresence>

            <Field id="auth-email" label="Email Address" type="email" icon={Mail} value={email} onChange={setEmail} required autoComplete="email" invalid={!!error} describedBy={error ? 'auth-error' : undefined} />
            <Field id="auth-password" label="Password" type="password" icon={Lock} value={password} onChange={setPassword} required autoComplete={isLogin ? 'current-password' : 'new-password'} invalid={!!error} describedBy={error ? 'auth-error' : undefined} />

            <AnimatePresence initial={false}>
              {!isLogin && role === 'athlete' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <label htmlFor="auth-dob" style={{ display: 'block', fontFamily: t.font.display, fontWeight: 700, fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 9 }}>
                      Date of Birth
                    </label>
                    <input
                      id="auth-dob"
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      style={{
                        width: '100%', background: FIELD, border: `1px solid ${LINE}`,
                        borderRadius: radii.md, padding: '14px 16px', fontSize: '1rem',
                        color: colors.textPrimary, fontFamily: t.font.body, outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                    <p style={{ color: colors.textTertiary, fontSize: '.68rem', margin: '6px 4px 0', fontFamily: t.font.body }}>
                      We use this to apply the right safety settings for under-18 athletes.
                    </p>
                  </div>
                  <Field
                    id="auth-guardian-email"
                    label="Parent / Guardian Email"
                    type="email"
                    icon={Mail}
                    value={guardianEmail}
                    onChange={setGuardianEmail}
                    required
                    autoComplete="off"
                  />
                  <p style={{ color: colors.textTertiary, fontSize: '.68rem', margin: '-8px 4px 16px', fontFamily: t.font.body }}>
                    Required. We'll email your grown up a code to approve your account — you can't start until they say yes.
                  </p>
                  <Field
                    id="auth-guardian-phone"
                    label="Parent / Guardian Phone (optional)"
                    type="tel"
                    icon={Phone}
                    value={guardianPhone}
                    onChange={setGuardianPhone}
                    autoComplete="off"
                  />
                  {googleCredential && (
                    <div style={{
                      marginBottom: 16, padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(139,59,255,0.08)', border: '1px solid rgba(139,59,255,0.2)',
                    }}>
                      <p style={{ color: colors.textPrimary, fontSize: '.8rem', margin: '0 0 10px', lineHeight: 1.5 }}>
                        Almost there! Add your parent or guardian's email above, then finish signing up with Google.
                      </p>
                      <Button
                        type="button"
                        disabled={loading}
                        onClick={handleGoogleGuardianRetry}
                        className="w-full uppercase tracking-[.08em]"
                        style={{ fontFamily: t.font.display, fontWeight: 800, fontSize: '.85rem' }}
                      >
                        <GoogleMark size={14} /> Finish signing up with Google
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
              <p style={{ color: colors.textSecondary, fontSize: '.72rem', margin: '-8px 0 16px', fontFamily: t.font.body, lineHeight: 1.4 }}>
                At least 8 characters.
              </p>
            )}

            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '.72rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.font.display, padding: '10px 0', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = colors.accent)}
                  onMouseLeave={e => (e.currentTarget.style.color = colors.textSecondary)}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  id="auth-error"
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    color: colors.dangerText, fontSize: '.84rem', margin: isLogin ? '0 0 16px' : '4px 0 16px',
                    fontWeight: 600, padding: '11px 14px', borderRadius: 10, wordBreak: 'break-word',
                    background: 'rgba(139,59,255,0.08)', border: '1px solid rgba(139,59,255,0.2)',
                  }}
                >{error}</motion.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full uppercase tracking-[.08em]"
              style={{ marginTop: isLogin ? 0 : 4, fontFamily: t.font.display, fontWeight: 900, fontSize: '1.05rem' }}
            >
              {loading
                ? <><span className="auth-spinner" aria-hidden /> {isLogin ? 'Signing in…' : 'Creating account…'}</>
                : <>{isLogin ? 'Sign In' : 'Create my account'}<ArrowRight size={16} /></>
              }
            </Button>

            {isLogin && (
              <DemoLoginButton role="player" onLoadingChange={setLoading} onError={msg => setError(msg ?? '')} />
            )}
          </form>

          {/* Consent / age block (signup only — also covers OAuth signup) */}
          {!isLogin && (
            <div style={{ marginTop: 16, fontSize: '.72rem', lineHeight: 1.55, color: colors.textSecondary, fontFamily: t.font.body }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, color: colors.textPrimary }}>
                Free to create your profile — no card required.
              </p>
              <p style={{ margin: '0 0 6px' }}>
                HERS365 is built for athletes 13+. If you're under 18, ask a parent or guardian to review with you.
              </p>
              <p style={{ margin: 0 }}>
                By creating an account you agree to our{' '}
                <Link to="/terms" style={{ color: 'var(--accent-text)', textDecoration: 'underline' }}>Terms</Link>{' '}
                and{' '}
                <Link to="/privacy" style={{ color: 'var(--accent-text)', textDecoration: 'underline' }}>Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: LINE }} />
            <span style={{ color: colors.textTertiary, fontSize: '.64rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', fontFamily: t.font.display }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: LINE }} />
          </div>

          {/* Social */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {googleClientId && !isNativePlatform ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed — please try again.')}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  text="continue_with"
                  width="400"
                />
              </div>
            ) : (
              <button
                type="button"
                disabled
                aria-label="Continue with Google (coming soon)"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  padding: '13px', background: FIELD,
                  border: `1px solid ${LINE}`, borderRadius: 11,
                  color: colors.textTertiary, fontSize: '.8rem', fontWeight: 800,
                  cursor: 'not-allowed', opacity: 0.5,
                  letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: t.font.display,
                }}
              >
                <GoogleMark size={16} />
                Google
                <span style={{ fontSize: '.62rem', letterSpacing: '.12em', color: colors.textTertiary, marginLeft: 4 }}>— Coming soon</span>
              </button>
            )}
          </div>

          {/* Footer line (login only — signup uses the CTA-adjacent consent block) */}
          {isLogin && registrationEnabled && (
            <p
              style={{
                fontSize: '.72rem', textAlign: 'center', color: colors.textTertiary, marginTop: 26, marginBottom: 0,
                lineHeight: 1.7, fontFamily: t.font.body,
              }}
            >
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '.72rem', cursor: 'pointer', fontFamily: t.font.body, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = colors.accent)}
                onMouseLeave={e => (e.currentTarget.style.color = colors.textSecondary)}
              >
                New here? Create an account <ArrowUpRight size={13} aria-hidden />
              </button>
            </p>
          )}

          {/* Registration closed — quiet, on-brand note where the signup affordance was */}
          {isLogin && !registrationEnabled && (
            <p
              style={{
                fontSize: '.72rem', textAlign: 'center', color: colors.textTertiary, marginTop: 26, marginBottom: 0,
                lineHeight: 1.7, fontFamily: t.font.body,
              }}
            >
              New signups are currently closed.
            </p>
          )}
          </>
          )}
        </motion.div>
      </main>

      <style>{`
        @supports (min-height:100dvh){.auth-root{min-height:100dvh !important;}}

        /* ── Subtle drifting flame orbs (GPU transforms only) ── */
        .auth-orb { will-change: transform, opacity; }
        .auth-orb-a { animation: auth-drift-a 22s ease-in-out infinite; }
        .auth-orb-b { animation: auth-drift-b 27s ease-in-out infinite; }
        @keyframes auth-drift-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(40px, -32px, 0) scale(1.08); }
        }
        @keyframes auth-drift-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(-34px, 26px, 0) scale(1.1); }
        }

        /* ── Live pulse ring on the brand dot ── */
        .auth-live-ring { position: relative; }
        .auth-live-ring::after {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          background: ${colors.accent};
          animation: auth-pulse 2.4s ease-out infinite;
        }
        @keyframes auth-pulse {
          0%   { transform: scale(1);   opacity: .6; }
          70%  { transform: scale(3);   opacity: 0;  }
          100% { transform: scale(3);   opacity: 0;  }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-orb, .auth-live-ring::after { animation: none !important; }
        }
      `}</style>
    </div>
  );
};
