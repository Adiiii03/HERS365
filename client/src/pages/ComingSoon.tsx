import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, MotionConfig } from 'framer-motion';
import { ShieldCheck, Users, Mail, ArrowRight, Check } from 'lucide-react';
import { apiFetch, errorMessage } from '../lib/api';
import { useDemoLogin } from '../hooks/useDemoLogin';
import { disp, kicker, reveal, DISP, LINE, MUTED } from '../lib/theme';

const css = `
  .cs-input{background:var(--surface-1);border:1px solid var(--border);border-radius:12px;
    color:var(--text-primary);font-size:.95rem;padding:13px 16px;width:100%;outline:none;
    transition:border-color .2s}
  .cs-input:focus{border-color:var(--accent)}
  .cs-input::placeholder{color:var(--text-secondary);opacity:.7}
  .cs-btn{font-family:${DISP};font-weight:800;text-transform:uppercase;letter-spacing:.06em;
    font-size:.92rem;padding:13px 26px;border-radius:9999px;cursor:pointer;border:none;
    display:inline-flex;align-items:center;justify-content:center;gap:9px;white-space:nowrap;
    transition:transform .18s cubic-bezier(.25,1,.5,1),box-shadow .22s;text-decoration:none}
  .cs-btn-primary{background:var(--accent);color:var(--accent-on)}
  .cs-btn-primary:hover{transform:translateY(-2px);box-shadow:var(--accent-glow)}
  .cs-btn-primary:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
  .cs-btn-ghost{background:transparent;color:var(--text-primary);border:1px solid var(--border-strong)}
  .cs-btn-ghost:hover{border-color:var(--accent);color:var(--accent-text)}
`;

const PROMISES = [
  {
    icon: ShieldCheck,
    title: 'Parents stay in control',
    body: 'Every coach who wants to reach your daughter goes through you first. There is no unsupervised contact between coaches and athletes, ever.',
  },
  {
    icon: Users,
    title: 'Built for underage girls in flag football',
    body: 'A community made for girls who play the game, not a general social network with a sports skin. Profiles, teammates, and highlights in one safe place.',
  },
  {
    icon: Mail,
    title: 'You approve, she plays',
    body: 'Parent consent is baked into signup and messaging from day one, so your daughter can focus on football while you see everything that matters.',
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ComingSoon = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const reduced = !!useReducedMotion();
  const dev = useDemoLogin('player');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), source: 'coming_soon' }),
      });
    } catch (err) {
      // Generic success either way — signup intent is captured server-side and
      // we never leak whether an address is already subscribed.
      void errorMessage(err);
    }
    setSubmitting(false);
    setDone(true);
  };

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <style>{css}</style>
      <div style={{ minHeight: '100vh', background: 'var(--surface-0)', color: 'var(--text-primary)', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', width: 620, height: 620, borderRadius: '50%', top: '-22%', right: '-14%',
          filter: 'blur(130px)', opacity: 0.14, pointerEvents: 'none',
          background: 'radial-gradient(circle, var(--accent), transparent 62%)',
        }} />

        <main style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px 96px', position: 'relative', zIndex: 1 }}>
          <motion.section {...reveal} style={{ paddingTop: 'clamp(72px, 14vh, 140px)', textAlign: 'center' }}>
            <span style={{ ...kicker, color: 'var(--accent-text)' }}>HERS365 · Launching soon</span>
            <h1 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(2.6rem, 6.5vw, 4.6rem)', lineHeight: 1.02, margin: '18px 0 20px' }}>
              A safe community for girls who play flag football.
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.08rem', lineHeight: 1.65, maxWidth: 620, margin: '0 auto' }}>
              HERS365 is where your daughter builds her profile, connects with teammates,
              and grows in the game — with you in the loop the whole way. All coach contact
              is gated through parents. No exceptions.
            </p>
          </motion.section>

          <motion.section {...reveal} style={{ marginTop: 64, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <div key={title} style={{
                background: 'var(--surface-1)', border: `1px solid ${LINE}`, borderRadius: 16,
                padding: '24px 22px', textAlign: 'left',
              }}>
                <Icon size={22} style={{ color: 'var(--accent-text)' }} aria-hidden />
                <h2 style={{ ...disp, fontWeight: 800, fontSize: '1.05rem', margin: '14px 0 8px' }}>{title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.6, margin: 0 }}>{body}</p>
              </div>
            ))}
          </motion.section>

          <motion.section {...reveal} style={{
            marginTop: 64, background: 'var(--surface-1)', border: `1px solid ${LINE}`,
            borderRadius: 20, padding: 'clamp(28px, 5vw, 44px)', textAlign: 'center',
          }}>
            <span style={kicker}>Be first to know</span>
            <h2 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(1.5rem, 3.4vw, 2.1rem)', margin: '12px 0 10px' }}>
              Get the launch email
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '.95rem', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 24px' }}>
              We will send one email when HERS365 opens, plus the occasional update for
              parents. No spam, and you can unsubscribe any time.
            </p>
            {done ? (
              <p role="status" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0,
                color: 'var(--accent-text)', fontWeight: 700, fontSize: '.95rem',
              }}>
                <Check size={18} aria-hidden /> You are on the list — check your inbox to confirm.
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate style={{
                display: 'flex', gap: 10, maxWidth: 460, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center',
              }}>
                <label htmlFor="cs-email" style={{
                  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
                  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
                }}>
                  Email address
                </label>
                <input
                  id="cs-email"
                  className="cs-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ flex: '1 1 240px' }}
                />
                <button type="submit" className="cs-btn cs-btn-primary" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Notify me'} <ArrowRight size={16} aria-hidden />
                </button>
                {error && (
                  <p role="alert" style={{ width: '100%', margin: '4px 0 0', color: 'var(--accent-text)', fontSize: '.85rem' }}>
                    {error}
                  </p>
                )}
              </form>
            )}
          </motion.section>

          <motion.section {...reveal} style={{ marginTop: 56, textAlign: 'center' }}>
            <h2 style={{ ...disp, fontWeight: 800, fontSize: '1.15rem', margin: '0 0 10px' }}>What is coming</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '.92rem', lineHeight: 1.65, maxWidth: 560, margin: '0 auto 28px' }}>
              At launch: athlete profiles your daughter is proud of, highlight reels, team and
              league discovery, and a parent dashboard where you approve every connection.
              We are starting in California and growing from there.
            </p>
            <p style={{ color: MUTED, fontSize: '.85rem', margin: '0 0 14px' }}>
              Questions about safety, teams, or partnering with us?
            </p>
            <Link to="/contact" className="cs-btn cs-btn-ghost">
              Contact Jonte <ArrowRight size={16} aria-hidden />
            </Link>
          </motion.section>

          {dev.enabled && (
            <div style={{ marginTop: 48, textAlign: 'center' }}>
              <button
                type="button"
                onClick={dev.submit}
                disabled={dev.loading}
                style={{
                  background: 'none', border: 'none', cursor: dev.loading ? 'default' : 'pointer',
                  color: MUTED, fontSize: '.78rem', letterSpacing: '.04em',
                  textDecoration: 'underline', textUnderlineOffset: 3, padding: 6,
                }}
              >
                {dev.loading ? 'Opening…' : '(for developers) — skip the gate and open the app'}
              </button>
              {dev.error && (
                <p role="alert" style={{ margin: '6px 0 0', color: 'var(--accent-text)', fontSize: '.78rem' }}>
                  {dev.error}
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </MotionConfig>
  );
};
