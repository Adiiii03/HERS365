import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Lock, ShieldAlert, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input } from '../../components/ui';
import { colors, type as t } from '../../lib/tokens';
import { planBySlug } from './billingPlans';

// Valerie's "COMPLETE YOUR PURCHASE" screen (P.P - BILLING & SUBSCRIPTIONS - PAYMENT),
// parametrized by plan slug. DEMO ONLY: there is no parent payment backend, so nothing
// is charged and the card fields are local state that is never sent anywhere. Complete
// Payment just advances the demo funnel to the receipt. Real checkout must go through
// Stripe (Elements/Checkout), never raw card fields to our server — see billing.md §C.

const CARD_BRANDS = ['Mastercard', 'Visa', 'Amex', 'Discover'];

export const ParentCheckout = () => {
  const { plan: slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const plan = planBySlug(slug);

  // Local-only, non-submitting fields. Nothing here is POSTed.
  const [card, setCard] = useState({ name: '', number: '', mm: '', yy: '', cvv: '' });
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');

  // Rookie is free (no checkout) and unknown slugs fall back to the plans page.
  if (!plan || plan.slug === 'rookie') return <Navigate to="/parent/billing" replace />;

  const complete = () => navigate(`/parent/billing/receipt/${plan.slug}`);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/parent/billing')}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
        style={{ color: colors.textTertiary }}
      >
        <ArrowLeft size={14} /> Back to plans
      </button>

      {/* Hero */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-[800] uppercase leading-none text-white" style={{ fontFamily: t.font.display }}>
          Get on the grid. <span style={{ color: plan.accent }}>Get recruited.</span>
        </h2>
      </div>

      {/* Demo banner */}
      <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.25)' }}>
        <ShieldAlert size={18} style={{ color: '#FFB020' }} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-white">Demo checkout &mdash; no real payment is processed.</p>
          <p className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
            Don&rsquo;t enter real card details; these fields are for preview only and are never sent
            anywhere. &ldquo;Complete Payment&rdquo; just shows the receipt screen.
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8">
        <h3 className="text-2xl font-[800] uppercase leading-none text-white" style={{ fontFamily: t.font.display }}>
          Complete your purchase
        </h3>

        {/* Payment method */}
        <div className="mt-6">
          <p className="text-[0.65rem] font-black uppercase tracking-widest mb-2" style={{ color: colors.textSecondary }}>Payment Method</p>
          <div className="flex flex-wrap gap-2">
            {CARD_BRANDS.map(b => (
              <span key={b} className="rounded-md px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide"
                style={{ background: colors.surface2, border: `1px solid ${colors.border}`, color: colors.textSecondary }}>
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Embedded plan card (tier-styled summary) */}
          <div className="relative rounded-xl overflow-hidden self-start" style={{ background: plan.bg, border: plan.border }}>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{
                left: -24, top: -18, width: 'calc(100% + 48px)', height: 180,
                transform: 'rotate(-18deg)', transformOrigin: 'top left', opacity: 0.9,
                background: `linear-gradient(90deg, rgba(${plan.accentRgb}, ${plan.glossAlpha}) 0%, rgba(${plan.accentRgb}, 0) 45%, rgba(${plan.accentRgb}, 0) 100%)`,
              }}
            />
            <div className="relative p-6">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: plan.labelColor }}>{plan.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-[800]" style={{ fontFamily: t.font.display, color: colors.textPrimary }}>{plan.price}</span>
                {plan.period && <span className="text-sm" style={{ color: colors.textTertiary }}>{plan.period}</span>}
              </div>
              <p className="mt-1 text-xs" style={{ color: colors.textTertiary }}>{plan.blurb}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: colors.textSecondary }}>
                    <Check size={14} style={{ color: plan.labelColor }} className="mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Credit card details (visual, non-submitting) */}
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-widest mb-3" style={{ color: colors.textSecondary }}>Credit Card Details</p>
            <div className="space-y-4">
              <Input label="Cardholder Name" placeholder="e.g. Jane Doe" autoComplete="off"
                value={card.name} onChange={(e) => setCard(c => ({ ...c, name: e.target.value }))} />
              <Input label="Card Number" placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="off"
                value={card.number} onChange={(e) => setCard(c => ({ ...c, number: e.target.value }))} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="Month" placeholder="MM" inputMode="numeric" autoComplete="off"
                  value={card.mm} onChange={(e) => setCard(c => ({ ...c, mm: e.target.value }))} />
                <Input label="Year" placeholder="YY" inputMode="numeric" autoComplete="off"
                  value={card.yy} onChange={(e) => setCard(c => ({ ...c, yy: e.target.value }))} />
                <Input label="CVV/CVC" placeholder="123" inputMode="numeric" autoComplete="off"
                  value={card.cvv} onChange={(e) => setCard(c => ({ ...c, cvv: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        {/* Contact information */}
        <div className="mt-8">
          <p className="text-[0.65rem] font-black uppercase tracking-widest mb-3" style={{ color: colors.textSecondary }}>Contact Information</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email Address" type="email" inputMode="email" placeholder="jane@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone Number" inputMode="tel" placeholder="(555) 000-0000"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        {/* Alternate pay */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: colors.border }} />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>Or pay with</span>
            <div className="h-px flex-1" style={{ background: colors.border }} />
          </div>
          <button
            type="button"
            onClick={complete}
            className="mt-4 w-full rounded-[9px] min-h-[48px] flex items-center justify-center gap-1.5 font-bold text-black"
            style={{ background: '#fff' }}
          >
            Apple Pay
          </button>
        </div>

        {/* Complete payment */}
        <div className="mt-6">
          <Button variant="primary" className="w-full" onClick={complete}
            style={{ background: plan.accent, border: `1px solid ${plan.accent}`, color: '#fff' }}>
            <Lock size={16} /> Complete Payment
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.65rem]" style={{ color: colors.textTertiary }}>
            <Lock size={12} /> Demo only &mdash; payments are not processed and no card data is stored.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ParentCheckout;
