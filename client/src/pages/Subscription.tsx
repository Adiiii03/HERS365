import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Zap, Star, Shield, ArrowRight, Flame } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { colors, type as t, radii } from '../lib/tokens';

const DISP = t.font.display;

interface Plan {
  id: number;
  name: string;
  price: number;
  tierLevel: string;
}

const PLAN_META: Record<string, {
  icon: React.ReactNode;
  accent: string;
  badge?: string;
  tagline: string;
  features: string[];
}> = {
  free: {
    icon: <Shield size={18} />,
    accent: colors.textSecondary,
    tagline: 'Get on the grid',
    features: [
      'Athlete profile (public)',
      'HERS365 community access',
      'Up to 3 highlight uploads',
      'Basic college program search',
      'HERS rankings listing',
    ],
  },
  pro: {
    icon: <Zap size={18} />,
    accent: colors.accent,
    badge: 'Most Popular',
    tagline: 'Get seen. Get recruited.',
    features: [
      'Everything in Rookie',
      'Unlimited highlight uploads',
      'Coach contact & DM access',
      'Performance analytics dashboard',
      'Priority ranking visibility',
      'College fit matching tool',
    ],
  },
  elite: {
    icon: <Star size={18} />,
    accent: colors.pink,
    tagline: 'Your dedicated recruiting edge',
    features: [
      'Everything in Pro',
      'Verified HERS365 badge',
      'Scout spotlight placement',
      'NIL deal tracker & marketplace',
      'Dedicated recruiting advisor',
      'Early access to new features',
    ],
  },
};

const FALLBACK_PLANS: Plan[] = [
  { id: 0, name: 'Rookie', price: 0, tierLevel: 'free' },
  { id: 1, name: 'Pro', price: 999, tierLevel: 'pro' },
  { id: 2, name: 'Elite', price: 2999, tierLevel: 'elite' },
];

export const Subscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Apple's IAP guideline 3.1.1 forbids in-app paid digital purchases that
  // route through anything other than IAP. On native iOS we route the user
  // to the web checkout in Safari instead of opening Stripe in WKWebView.
  const isNativePlatform = Capacitor.isNativePlatform();

  const cancelledMsg = searchParams.get('subscription') === 'cancelled'
    ? 'Checkout cancelled — no charge was made.'
    : '';

  useEffect(() => {
    fetch('/api/subscription-plans')
      .then(r => r.json())
      .then(data => setPlans(Array.isArray(data) && data.length > 0 ? data : FALLBACK_PLANS))
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (plan: Plan) => {
    const raw = localStorage.getItem('user');
    if (!raw) { navigate('/auth?redirect=/subscribe'); return; }
    const user = JSON.parse(raw);
    const token = localStorage.getItem('token');
    setCheckingOut(plan.id);
    setError('');
    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId: plan.id,
          playerId: user.id,
          successUrl: plan.price === 0
            ? `${window.location.origin}/profile`
            : `${window.location.origin}/thank-you?plan=${encodeURIComponent(plan.name)}&amount=${plan.price}&interval=month`,
          cancelUrl: `${window.location.origin}/subscribe?subscription=cancelled`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Checkout failed. Try again.'); return; }
      if (data.free || !data.url) navigate('/profile');
      else window.location.href = data.url;
    } catch {
      setError('Network error. Try again.');
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.textSecondary, fontSize: t.size.base }}>Loading plans…</div>
      </div>
    );
  }

  return (
    <div style={{ background: colors.surface0, minHeight: '100vh', color: colors.textPrimary, fontFamily: t.font.body, padding: '0 0 120px' }}>
      {/* BG gradient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(139,59,255,.12) 0%, transparent 65%)' }} />

      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '52px 20px 0', position: 'relative' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: radii.pill, background: `${colors.accent}15`, border: `1px solid ${colors.accent}35`, marginBottom: 18 }}>
            <Flame size={12} color={colors.accent} fill={colors.accent} />
            <span style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>HERS365 MEMBERSHIP</span>
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: 'clamp(2.6rem, 6vw, 4rem)', fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: 0.95 }}>
            Get On The Grid.<br />
            <em style={{ color: colors.accent, fontStyle: 'normal' }}>Get Recruited.</em>
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: t.size.md, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Every coach on HERS365 is looking for their next athlete. Your tier determines how visible you are.
          </p>
        </motion.div>

        {/* Error / cancel banners */}
        <AnimatePresence>
          {cancelledMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: `${colors.pink}1a`, border: `1px solid ${colors.pink}40`, borderRadius: radii.sm, padding: '12px 16px', marginBottom: 20, textAlign: 'center', fontSize: t.size.base, color: colors.pinkText }}>
              {cancelledMsg}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: `${colors.danger}1a`, border: `1px solid ${colors.danger}40`, borderRadius: radii.sm, padding: '12px 16px', marginBottom: 20, textAlign: 'center', fontSize: t.size.base, color: colors.dangerText }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map((plan, i) => {
            const meta = PLAN_META[plan.tierLevel] || PLAN_META['free'];
            const isPro = plan.tierLevel === 'pro';
            const isBusy = checkingOut === plan.id;
            const isHovered = hoveredPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  position: 'relative',
                  background: isPro
                    ? `linear-gradient(145deg, rgba(139,59,255,.1) 0%, rgba(139,59,255,.04) 100%)`
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPro ? `${colors.accent}50` : isHovered ? `rgba(255,255,255,0.12)` : colors.border}`,
                  borderRadius: radii.lg,
                  padding: '28px 26px 26px',
                  transform: isHovered && !isBusy ? 'translateY(-4px)' : isPro ? 'translateY(-8px)' : 'none',
                  transition: 'transform 0.25s ease, border-color 0.2s, box-shadow 0.25s',
                  boxShadow: isPro ? `0 24px 60px rgba(139,59,255,.18)` : isHovered ? '0 12px 40px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {/* Popular badge */}
                {meta.badge && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: colors.accent, color: colors.accentOn, padding: '4px 14px', borderRadius: radii.pill, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {meta.badge}
                  </div>
                )}

                {/* Plan header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: meta.accent, marginBottom: 5 }}>
                      {meta.icon}
                      <span style={{ fontFamily: DISP, fontSize: t.size.base, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{plan.name}</span>
                    </div>
                    <div style={{ fontSize: t.size.base, color: colors.textTertiary, lineHeight: 1.3 }}>{meta.tagline}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {plan.price === 0 ? (
                      <div style={{ fontFamily: DISP, fontSize: t.size['2xl'], fontWeight: t.weight.bold, lineHeight: 1, color: colors.textPrimary }}>Free</div>
                    ) : (
                      <>
                        <div style={{ fontFamily: DISP, fontSize: t.size['3xl'], fontWeight: t.weight.bold, lineHeight: 1, color: colors.textPrimary }}>${(plan.price / 100).toFixed(0)}</div>
                        <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginTop: 2 }}>per month</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: colors.border, marginBottom: 18 }} />

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {meta.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${meta.accent}20`, border: `1px solid ${meta.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Check size={9} color={meta.accent} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: t.size.base, color: colors.textSecondary, lineHeight: 1.4 }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isNativePlatform && plan.price > 0 ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => window.open('https://hers365.vercel.app/subscribe', '_system')}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      borderRadius: radii.sm,
                      border: isPro ? 'none' : `1px solid ${colors.border}`,
                      background: isPro ? colors.accent : `${colors.pink}1f`,
                      color: colors.accentOn,
                      fontFamily: DISP,
                      fontWeight: t.weight.bold,
                      fontSize: t.size.md,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      boxShadow: isPro ? '0 8px 24px rgba(139,59,255,.35)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      Subscribe at hers365.com<ArrowRight size={15} />
                    </span>
                    <span style={{ fontSize: t.size.xs, fontWeight: t.weight.semibold, letterSpacing: '0.08em', opacity: 0.8 }}>Opens in Safari</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSelect(plan)}
                    disabled={isBusy}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      borderRadius: radii.sm,
                      border: isPro ? 'none' : `1px solid ${colors.border}`,
                      background: isPro ? colors.accent : plan.price === 0 ? 'rgba(255,255,255,0.05)' : `${colors.pink}1f`,
                      color: colors.accentOn,
                      fontFamily: DISP,
                      fontWeight: t.weight.bold,
                      fontSize: t.size.md,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      opacity: isBusy ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: isPro ? '0 8px 24px rgba(139,59,255,.35)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    {isBusy ? (
                      <><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: colors.accentOn, animation: 'spin 0.8s linear infinite' }} />Redirecting…</>
                    ) : (
                      <>{plan.price === 0 ? 'Start Free' : `Get ${plan.name}`}<ArrowRight size={15} /></>
                    )}
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Trust row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 40, flexWrap: 'wrap' }}>
          {[
            { icon: <Shield size={13} />, text: 'Cancel anytime' },
            { icon: <Check size={13} />, text: 'Secure checkout via Stripe' },
            { icon: <Zap size={13} />, text: 'Instant access on signup' },
          ].map((item) => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: t.size.sm, color: colors.textTertiary }}>
              {item.icon}{item.text}
            </div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ marginTop: 52, background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: '28px 32px' }}>
          <div style={{ fontFamily: DISP, fontSize: t.size.base, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 18 }}>Why athletes upgrade</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { stat: '3.4×', label: 'more coach views on Pro profiles' },
              { stat: '67%', label: 'of recruits are found through reels' },
              { stat: '12k+', label: 'athletes already on the grid' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: DISP, fontSize: t.size['3xl'], fontWeight: t.weight.bold, color: colors.accent, lineHeight: 1 }}>{s.stat}</div>
                <div style={{ fontSize: t.size.base, color: colors.textSecondary, marginTop: 5, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
