import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';
import { Badge, Button } from '../../components/ui';
import { colors, type as t } from '../../lib/tokens';
import { PLANS, PURPLE } from './billingPlans';

// Billing & Subscription (Valerie's P.P - BILLING & SUBSCRIPTIONS). Spec:
// output/parent-portal-spec/billing.md. Plans page of the funnel.
//
// A full Stripe system exists server-side (/api/payments) but it is athlete/admin
// scoped: every route 403s for a parent (canAccessPlayer), and 503s without Stripe
// keys. There is no parent-as-payer model, so there is still NO real charge here. The
// CTAs now navigate an honest DEMO funnel (checkout form -> receipt), clearly flagged;
// no card data is ever sent anywhere. Start Free just drops the parent on the Dashboard.

export const ParentBilling = () => {
  const navigate = useNavigate();

  const onSelect = (slug: string) => {
    if (slug === 'rookie') navigate('/parent/dashboard');
    else navigate(`/parent/billing/checkout/${slug}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Honest demo banner — the funnel is interactive but no real charge happens. */}
      <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
        <Info size={18} style={{ color: colors.accent }} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-white">Interactive preview &mdash; no real payment is processed yet.</p>
          <p className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
            You can walk the checkout flow, but it&rsquo;s a demo: nothing is charged and no card details
            are sent anywhere. Real checkout will run through Stripe, never raw card fields on our servers.
          </p>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center">
        <span
          className="inline-flex items-center rounded px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em]"
          style={{ background: 'rgba(139,59,255,0.15)', border: '1px solid rgba(139,59,255,0.3)', color: colors.accent }}
        >
          HERS365 Membership
        </span>
        <h2 className="mt-4 text-5xl lg:text-[4rem] font-[800] uppercase leading-[0.95] text-white" style={{ fontFamily: t.font.display }}>
          Get on the grid.<br />
          <span style={{ color: colors.accent }}>Get recruited.</span>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
          Every coach on HERS365 is looking for their next athlete. Your tier determines how visible you are.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="relative"
          >
            {/* Badge lives on the wrapper, not the card: the card is overflow-hidden
                and would clip a negatively-positioned pill. */}
            {plan.popular && (
              <Badge className="absolute -top-2 left-6 z-10" style={{ background: PURPLE, color: '#fff', borderColor: PURPLE }}>Most Popular</Badge>
            )}
            <div
              className="relative h-full rounded-xl overflow-hidden"
              style={{ background: plan.bg, border: plan.border }}
            >
              {/* Diagonal gloss strip across the top (from the mockup SVG). */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute"
                style={{
                  left: -24,
                  top: -18,
                  width: 'calc(100% + 48px)',
                  height: 180,
                  transform: 'rotate(-18deg)',
                  transformOrigin: 'top left',
                  opacity: 0.9,
                  background: `linear-gradient(90deg, rgba(${plan.accentRgb}, ${plan.glossAlpha}) 0%, rgba(${plan.accentRgb}, 0) 45%, rgba(${plan.accentRgb}, 0) 100%)`,
                }}
              />

              <div className="relative flex flex-col h-full p-6">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest" style={{ color: plan.labelColor }}>{plan.name}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-[800]" style={{ fontFamily: t.font.display, color: colors.textPrimary }}>{plan.price}</span>
                    {plan.period && <span className="text-sm" style={{ color: colors.textTertiary }}>{plan.period}</span>}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: colors.textTertiary }}>{plan.blurb}</p>
                </div>

                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: colors.textSecondary }}>
                      <Check size={14} style={{ color: plan.labelColor }} className="mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${plan.divider}` }}>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => onSelect(plan.slug)}
                    style={plan.button}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-xs" style={{ color: colors.textTertiary }}>
        Questions about membership? Contact{' '}
        <span className="font-semibold text-white">support@hers365.com</span>.
      </p>
    </div>
  );
};

export default ParentBilling;
