import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, MotionConfig } from 'framer-motion';
import { ShieldCheck, Users, Mail, ArrowRight, Check } from 'lucide-react';
import { apiFetch, errorMessage } from '../lib/api';
import { useDemoLogin } from '../hooks/useDemoLogin';
import { reveal } from '../lib/theme';
import { cn } from '../lib/cn';
import { Button, Card, Input } from '../components/ui';
import { colors, type as t, radii, spacing } from '../lib/tokens';

const css = `
  .cs-mesh{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
  .cs-mesh span{position:absolute;border-radius:50%;filter:blur(120px);opacity:.16;will-change:transform}
  .cs-mesh .m1{width:560px;height:560px;top:-18%;right:-12%;
    background:radial-gradient(circle,var(--accent),transparent 62%);
    animation:cs-drift-a 22s ease-in-out infinite}
  .cs-mesh .m2{width:520px;height:520px;bottom:-22%;left:-14%;
    background:radial-gradient(circle,var(--pink),transparent 62%);
    animation:cs-drift-b 26s ease-in-out infinite}
  .cs-mesh .m3{width:420px;height:420px;top:34%;left:38%;opacity:.1;
    background:radial-gradient(circle,var(--accent),transparent 60%);
    animation:cs-drift-c 30s ease-in-out infinite}
  @keyframes cs-drift-a{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(-6%,7%,0) scale(1.08)}}
  @keyframes cs-drift-b{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(8%,-6%,0) scale(1.06)}}
  @keyframes cs-drift-c{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(5%,-5%,0) scale(1.1)}}
  @media (prefers-reduced-motion: reduce){
    .cs-mesh .m1,.cs-mesh .m2,.cs-mesh .m3{animation:none}
  }
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

const kicker = {
  fontFamily: t.font.display,
  fontSize: t.size.xs,
  fontWeight: t.weight.bold,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: colors.textTertiary,
};

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
      <div style={{ minHeight: '100vh', background: colors.surface0, color: colors.textPrimary, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden className="cs-mesh">
          <span className="m1" />
          <span className="m2" />
          <span className="m3" />
        </div>

        <main style={{ maxWidth: 880, margin: '0 auto', padding: `0 ${spacing.space5} ${spacing.space9}`, position: 'relative', zIndex: 1 }}>
          <motion.section {...reveal} style={{ paddingTop: 'clamp(72px, 14vh, 140px)', textAlign: 'center' }}>
            <span style={{ ...kicker, color: colors.accentText }}>HERS365 · Launching soon</span>
            <h1 style={{
              fontFamily: t.font.display,
              fontWeight: t.weight.bold,
              fontSize: 'clamp(2.8rem, 7vw, 5rem)',
              letterSpacing: t.tracking.display,
              lineHeight: 0.98,
              textTransform: 'uppercase',
              margin: '18px 0 20px',
            }}>
              A safe community for girls who play flag football.
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: t.size.lg, lineHeight: 1.65, maxWidth: 620, margin: '0 auto' }}>
              HERS365 is where your daughter builds her profile, connects with teammates,
              and grows in the game — with you in the loop the whole way. All coach contact
              is gated through parents. No exceptions.
            </p>
          </motion.section>

          <motion.section {...reveal} style={{ marginTop: 64, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <Card key={title} style={{ padding: '24px 22px', textAlign: 'left' }}>
                <Icon size={22} style={{ color: colors.accentText }} aria-hidden />
                <h2 style={{ fontFamily: t.font.display, fontWeight: t.weight.semibold, fontSize: t.size.lg, letterSpacing: t.tracking.h2, margin: '14px 0 8px' }}>{title}</h2>
                <p style={{ color: colors.textSecondary, fontSize: t.size.md, lineHeight: 1.6, margin: 0 }}>{body}</p>
              </Card>
            ))}
          </motion.section>

          <motion.section {...reveal} style={{ marginTop: 64 }}>
            <Card style={{ borderRadius: radii.lg, padding: 'clamp(28px, 5vw, 44px)', textAlign: 'center' }}>
              <span style={kicker}>Be first to know</span>
              <h2 style={{ fontFamily: t.font.display, fontWeight: t.weight.bold, fontSize: t.size['2xl'], letterSpacing: t.tracking.h1, textTransform: 'uppercase', margin: '12px 0 10px' }}>
                Get the launch email
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: t.size.md, lineHeight: 1.6, maxWidth: 460, margin: '0 auto 24px' }}>
                We will send one email when HERS365 opens, plus the occasional update for
                parents. No spam, and you can unsubscribe any time.
              </p>
              {done ? (
                <p role="status" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0,
                  color: colors.accentText, fontWeight: t.weight.bold, fontSize: t.size.md,
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
                  <Input
                    id="cs-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-[1_1_240px]"
                  />
                  <Button type="submit" size="lg" loading={submitting}>
                    {submitting ? 'Sending…' : 'Notify me'} {!submitting && <ArrowRight size={16} aria-hidden />}
                  </Button>
                  {error && (
                    <p role="alert" style={{ width: '100%', margin: '4px 0 0', color: colors.accentText, fontSize: t.size.sm }}>
                      {error}
                    </p>
                  )}
                </form>
              )}
            </Card>
          </motion.section>

          <motion.section {...reveal} style={{ marginTop: 56, textAlign: 'center' }}>
            <h2 style={{ fontFamily: t.font.display, fontWeight: t.weight.semibold, fontSize: t.size.xl, letterSpacing: t.tracking.h2, textTransform: 'uppercase', margin: '0 0 10px' }}>What is coming</h2>
            <p style={{ color: colors.textSecondary, fontSize: t.size.md, lineHeight: 1.65, maxWidth: 560, margin: '0 auto 28px' }}>
              At launch: athlete profiles your daughter is proud of, highlight reels, team and
              league discovery, and a parent dashboard where you approve every connection.
              We are starting in California and growing from there.
            </p>
            <p style={{ color: colors.textTertiary, fontSize: t.size.sm, margin: '0 0 14px' }}>
              Questions about safety, teams, or partnering with us?
            </p>
            <Link
              to="/contact"
              className={cn(
                'k-btn k-btn-ghost inline-flex items-center gap-[7px] min-h-[44px] px-[18px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)] no-underline',
              )}
            >
              Contact Jonte <ArrowRight size={16} aria-hidden />
            </Link>
          </motion.section>

          {dev.enabled && (
            <div style={{ marginTop: 48, textAlign: 'center' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={dev.submit}
                loading={dev.loading}
                className="!bg-transparent !border-0 !text-[var(--text-tertiary)] hover:!text-[var(--text-secondary)] underline underline-offset-[3px] tracking-[0.04em]"
              >
                {dev.loading ? 'Opening…' : '(for developers) — skip the gate and open the app'}
              </Button>
              {dev.error && (
                <p role="alert" style={{ margin: '6px 0 0', color: colors.accentText, fontSize: t.size.sm }}>
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
