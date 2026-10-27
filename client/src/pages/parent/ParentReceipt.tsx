import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import { colors, type as t } from '../../lib/tokens';
import { planBySlug } from './billingPlans';

// Valerie's "Payment Success!" receipt (P.P - BILLING & SUBSCRIPTIONS - RECEIPT-CARD),
// parametrized by plan slug. DEMO ONLY — reached from the demo checkout; no real charge
// happened. Uses the plan's real price (Elite Yearly = $499.99, fixing the mockup's
// copy-paste $29.99 bug) and the signed-in parent's name for the Account row.

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold text-white">{label}</span>
      <span className="text-sm text-white/90">{value}</span>
    </div>
  );
}

export const ParentReceipt = () => {
  const { plan: slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const plan = planBySlug(slug);

  // Stable demo receipt id for this mount.
  const [receiptId] = useState(() => String(Math.floor(Math.random() * 1e12)).padStart(12, '0'));

  if (!plan || plan.slug === 'rookie') return <Navigate to="/parent/billing" replace />;

  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const account = user?.name || 'Parent';

  return (
    <div className="max-w-md mx-auto py-6">
      <div
        className="rounded-2xl p-8"
        style={{ background: colors.surface1, border: `1px solid ${plan.accent}`, boxShadow: `0 8px 40px -12px ${plan.accent}` }}
      >
        <p className="text-center text-xl font-[800] uppercase tracking-wide" style={{ fontFamily: t.font.display, color: plan.accent }}>
          {plan.name}
        </p>

        <div className="mt-4 flex justify-center">
          <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)' }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: colors.success }}>
              <Check size={20} className="text-black" />
            </span>
          </span>
        </div>

        <h2 className="mt-4 text-center text-xl font-semibold text-white">Payment Success!</h2>

        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          <Row label="Date" value={today} />
          <Row label="Receipt ID" value={receiptId} />
          <Row label="Payment Method" value="Apple Pay" />
          <Row label="Account" value={account} />
        </div>

        <div className="my-4 border-t border-dashed" style={{ borderColor: colors.borderStrong }} />

        <div className="space-y-3">
          <Row label="Total Payment" value={`USD ${plan.price}`} />
          <Row label="Tax" value="USD 0.00" />
        </div>

        <p className="mt-5 text-center text-[0.65rem]" style={{ color: colors.textTertiary }}>
          Demo receipt &mdash; no real payment was processed.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => navigate('/parent/billing')}>Back to Billing</Button>
        <Button variant="primary" className="flex-1" onClick={() => navigate('/parent/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  );
};

export default ParentReceipt;
