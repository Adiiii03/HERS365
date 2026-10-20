import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Diamond, ChevronRight, Check, X, CreditCard, ArrowRight, Plus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Stat, Badge, Button, EmptyState } from '../../components/ui';
import { RowSkeleton, StatCardSkeleton } from '../../components/ui';
import { InviteAthleteSheet } from '../../components/parent/InviteAthleteSheet';
import { athleteHeadshot, DEMO_HERO_BG } from '../../components/parent/demoImages';
import { isDemoParent } from '../../components/parent/demoParent';
import { useAuth } from '../../context/AuthContext';
import { colors, type as t } from '../../lib/tokens';

// New sidebar-layout Dashboard for the parent portal (Valerie's mockup
// P.P - DASHBOARD). Real data comes from /api/parent/*; metrics and billing
// without a backing endpoint are rendered as clearly-flagged sample data.

interface Child {
  id: number;
  name: string;
  position: string | null;
  gradYear: number | null;
  profileImage?: string;
  stars?: number;
  breakoutScore?: number;
  offers?: number;
  verifiedStatus?: 'Verified' | 'Pending Review' | 'Action Required';
  profileCompleteness?: number;
}

interface PendingMsg {
  id: number;
  from: string;
  role: string;
  org: string;
  preview: string;
  child: string;
  createdAt: string;
}

const DEFAULT_CHILD: Child = {
  id: 101,
  name: 'Maya Johnson',
  position: 'QB',
  gradYear: 2027,
  stars: 4,
  breakoutScore: 4.2,
  offers: 4,
  verifiedStatus: 'Verified',
};

// Mockup metrics with no backing endpoint yet — flagged as sample in the UI.
const SAMPLE_METRICS = [
  { label: 'Coach Views', value: 47 },
  { label: 'Film Views', value: 128 },
  { label: 'Schools Following', value: 4 },
];

// Shown when /children returns no rating. Matches My Athletes' sample so the same
// athlete doesn't read "4.2" there and "—" here.
const SAMPLE_RATING = 4.2;

// Flag-football next step (the app is Girls Flag Football, not basketball).
const SAMPLE_NEXT_STEP = 'Verify passing stats';

// Billing has no parent endpoint yet; shown as a non-interactive sample panel.
const SAMPLE_BILLING = {
  plan: 'Pro Plan — $29.99/mo',
  nextBilling: 'Oct 15, 2026',
  method: 'Visa •••• 4242',
};

export const ParentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Demo account only: pre-seed the mockup child + sample metrics/billing. Every other
  // parent starts empty and only ever shows their real linked athlete (or an invite prompt).
  const demo = isDemoParent(user);
  const [children, setChildren] = useState<Child[]>(demo ? [DEFAULT_CHILD] : []);
  const [activeChildId, setActiveChildId] = useState<number>(demo ? DEFAULT_CHILD.id : 0);
  const [requests, setRequests] = useState<PendingMsg[]>([]);
  const [acting, setActing] = useState<number | null>(null);
  const [actError, setActError] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Lifted from pages/ParentDashboard.tsx: Promise.all with per-call catch and
  // the { success, data } envelope normalization.
  const fetchAll = useCallback(async () => {
    try {
      const [cData, rData] = await Promise.all([
        apiFetch('/api/parent/children').catch(() => null),
        apiFetch('/api/parent/requests').catch(() => null),
      ]);

      if (cData?.success && Array.isArray(cData.data) && cData.data.length > 0) {
        // Never default an unknown status to 'Verified' on a minor (a safety claim
        // we don't enforce). The server returns 'Verified' | 'Pending Review'; fall
        // back to 'Pending Review' only if it's somehow missing.
        const mapped: Child[] = cData.data.map((c: Child) => ({ ...c, verifiedStatus: c.verifiedStatus || 'Pending Review' }));
        setChildren(mapped);
        setActiveChildId(mapped[0].id);
      }

      if (rData?.success && Array.isArray(rData.data)) {
        setRequests(rData.data);
      }
    } catch (err) {
      console.error('[ParentDashboard] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const respond = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    setActError(null);
    try {
      // Only drop the row once the server confirms. A failed call must not look
      // like a resolved approval on a minor's coach-contact queue.
      const res = await apiFetch<{ success: boolean }>(`/api/parent/requests/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }).catch(() => null);
      if (res?.success) {
        setRequests(prev => prev.filter(r => r.id !== id));
      } else {
        setActError(id);
      }
    } finally {
      setActing(null);
    }
  };

  // Invite / link an athlete by email → POST /api/parent/invite-athlete (real).
  const [inviteOpen, setInviteOpen] = useState(false);

  const activeChild = children.find(c => c.id === activeChildId) || children[0];
  // The /children endpoint doesn't return a rating yet, so fall back to the same
  // sample value My Athletes shows (flagged "Sample data") instead of a bare dash.
  const realScore = activeChild?.breakoutScore ?? activeChild?.stars;
  const scoreIsSample = realScore == null;
  const score = realScore ?? SAMPLE_RATING;
  const scoreWhole = Math.round(score);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Child switcher */}
      {children.length > 0 && (
        <div className="flex items-center gap-4">
          {children.map(c => {
            const active = c.id === activeChildId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveChildId(c.id)}
                className="flex flex-col items-center gap-1 group"
                aria-pressed={active}
              >
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white overflow-hidden"
                  style={{
                    background: colors.surface2,
                    border: active ? `2px solid ${colors.accent}` : '2px solid transparent',
                    boxShadow: active ? '0 0 16px rgba(139,59,255,0.35)' : undefined,
                  }}
                >
                  <img src={c.profileImage || athleteHeadshot(c.name, c.id, demo)} alt="" className="w-full h-full object-cover" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: active ? colors.textPrimary : colors.textTertiary }}>
                  {c.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="flex flex-col items-center gap-1"
            aria-label="Invite an athlete"
          >
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center border border-dashed transition-colors hover:border-solid"
              style={{ borderColor: colors.borderStrong, color: colors.textTertiary }}
            >
              <Plus size={18} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textTertiary }}>
              Add
            </span>
          </button>
        </div>
      )}

      {/* No linked athlete yet (non-demo): honest invite prompt instead of a fabricated child. */}
      {!activeChild && !loading && (
        <Card className="p-8">
          <EmptyState
            icon={<Plus size={28} />}
            title="No athlete linked yet"
            body="Invite your athlete to see their profile, HERS score, and approvals here."
          />
          <div className="flex justify-center mt-4">
            <Button variant="primary" size="md" onClick={() => setInviteOpen(true)}>
              <Plus size={16} /> Invite an athlete
            </Button>
          </div>
        </Card>
      )}

      {/* Hero: athlete card + HERS score */}
      {activeChild && (
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card
          className="flex items-center gap-5 p-6 bg-center bg-cover"
          // Demo-only hero backdrop (AI mock action photo). Real parents get the
          // plain Card background, never placeholder imagery.
          style={demo ? { backgroundImage: `linear-gradient(90deg, rgba(10,10,12,0.94) 40%, rgba(10,10,12,0.70)), url(${DEMO_HERO_BG})` } : undefined}
        >
          <span
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white overflow-hidden shrink-0"
            style={{ background: colors.surface2, border: `2px solid ${colors.accent}` }}
          >
            <img src={activeChild?.profileImage || athleteHeadshot(activeChild?.name, activeChild?.id ?? 0, demo)} alt="" className="w-full h-full object-cover" />
          </span>
          <div className="min-w-0">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-[800] uppercase leading-[0.95] text-white" style={{ fontFamily: t.font.display }}>
              {activeChild?.name}
            </h2>
            <p className="mt-2 text-sm font-bold uppercase tracking-wide" style={{ color: colors.accentText }}>
              {activeChild?.position || 'Athlete'}
              {activeChild?.gradYear ? ` · Class of ${activeChild.gradYear}` : ''}
            </p>
            {activeChild?.verifiedStatus && (
              <Badge tone={activeChild.verifiedStatus === 'Verified' ? 'success' : 'neutral'} className="mt-3">
                {activeChild.verifiedStatus}
              </Badge>
            )}
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-center min-w-[220px]">
          {scoreIsSample && !demo ? (
            // Real child without a rating yet: honest state, never a fabricated number.
            <>
              <div className="text-2xl font-[800] leading-none" style={{ fontFamily: t.font.display, color: colors.textSecondary }}>
                Not rated yet
              </div>
              <div className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.08em]" style={{ color: colors.textTertiary }}>
                HERS Score
              </div>
              <p className="mt-1.5 text-xs" style={{ color: colors.textTertiary }}>
                Appears once your athlete has been rated.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Diamond
                    key={i}
                    size={14}
                    style={{ color: colors.accent }}
                    fill={i < scoreWhole ? colors.accent : 'transparent'}
                  />
                ))}
              </div>
              <div className="mt-3 text-4xl font-[800] leading-none tnum" style={{ fontFamily: t.font.display, color: colors.textPrimary }}>
                {score.toFixed(1)}
              </div>
              <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.08em]" style={{ color: colors.textTertiary }}>
                HERS Score · Overall athlete rating
              </div>
              {scoreIsSample && <Badge tone="neutral" className="mt-2 self-start">Sample data</Badge>}
            </>
          )}
        </Card>
      </div>
      )}

      {/* Performance — demo shows sample metrics; real users see their real profile
          completeness plus "—" placeholders for the metrics that have no endpoint yet,
          so the card is present (not missing) even with no data. */}
      {(demo || activeChild) && (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>Performance</h3>
          {demo && <Badge tone="neutral">Sample data</Badge>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : demo ? (
              <>
                <Stat label="Profile Completeness" value="82%" />
                {SAMPLE_METRICS.map(m => <Stat key={m.label} label={m.label} value={m.value} />)}
              </>
            ) : (
              <>
                <Stat label="Profile Completeness" value={activeChild?.profileCompleteness != null ? `${activeChild.profileCompleteness}%` : '—'} />
                {SAMPLE_METRICS.map(m => <Stat key={m.label} label={m.label} value="—" />)}
              </>
            )}
        </div>
        {!demo && (
          <p className="mt-2 text-[0.65rem]" style={{ color: colors.textTertiary }}>
            Views and following connect as your athlete gets active.
          </p>
        )}
      </div>
      )}

      {/* Verifications / Approvals + Billing */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: colors.textSecondary }}>
            Verifications / Approvals
          </h3>
          {loading ? (
            <div className="space-y-1">{Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}</div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<Check size={28} />}
              title="All caught up"
              body="No pending approvals right now. Coach message requests will appear here for your review."
            />
          ) : (
            <ul className="space-y-3">
              {requests.map(req => (
                <motion.li
                  key={req.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between gap-3 rounded-xl p-3"
                  style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{req.from}</p>
                    <p className="text-xs truncate" style={{ color: colors.textTertiary }}>
                      {req.role}{req.org ? ` · ${req.org}` : ''}{req.child ? ` → ${req.child}` : ''}
                    </p>
                    {actError === req.id && (
                      <p className="text-xs mt-1" style={{ color: colors.dangerText }}>
                        Could not save that. Still pending, try again.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="primary" loading={acting === req.id} onClick={() => respond(req.id, 'approve')} aria-label="Approve">
                      <Check size={15} />
                    </Button>
                    <Button size="sm" variant="ghost" disabled={acting === req.id} onClick={() => respond(req.id, 'reject')} aria-label="Reject">
                      <X size={15} />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>
              Billing &amp; Subscription
            </h3>
            {demo && <Badge tone="neutral">Sample data</Badge>}
          </div>
          {demo ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt style={{ color: colors.textTertiary }}>Current Plan</dt>
                <dd className="font-bold text-white">{SAMPLE_BILLING.plan}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt style={{ color: colors.textTertiary }}>Next Billing Date</dt>
                <dd className="font-bold text-white">{SAMPLE_BILLING.nextBilling}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt style={{ color: colors.textTertiary }}>Payment Method</dt>
                <dd className="font-bold text-white">{SAMPLE_BILLING.method}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm" style={{ color: colors.textTertiary }}>
              No subscription on file. Billing isn&rsquo;t connected yet.
            </p>
          )}
          <Button variant="primary" size="md" className="mt-5 w-full" disabled title="Billing is not wired yet">
            <CreditCard size={16} /> Manage <ArrowRight size={16} />
          </Button>
          <p className="mt-2 text-center text-[0.65rem]" style={{ color: colors.textTertiary }}>
            Payments are not connected yet.
          </p>
        </Card>
      </div>

      {/* Next step — demo shows the sample suggestion; real users get an honest prompt
          derived from profile completeness (never fabricated), so the card still shows. */}
      {activeChild && (demo ? (
        <Card hover className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-bold text-white">{SAMPLE_NEXT_STEP}</p>
            <p className="text-xs" style={{ color: colors.textTertiary }}>Next step to boost {activeChild.name.split(' ')[0]}&rsquo;s profile</p>
          </div>
          <ChevronRight size={20} style={{ color: colors.accent }} />
        </Card>
      ) : (activeChild.profileCompleteness ?? 0) < 100 ? (
        <Card hover className="flex items-center justify-between gap-4 p-5 cursor-pointer" onClick={() => navigate('/parent/athletes')}>
          <div>
            <p className="text-sm font-bold text-white">Complete {activeChild.name.split(' ')[0]}&rsquo;s profile</p>
            <p className="text-xs" style={{ color: colors.textTertiary }}>A fuller profile gets more coach attention.</p>
          </div>
          <ChevronRight size={20} style={{ color: colors.accent }} />
        </Card>
      ) : (
        <Card className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-bold text-white">Profile looks complete</p>
            <p className="text-xs" style={{ color: colors.textTertiary }}>Nice work. Keep stats and film up to date.</p>
          </div>
        </Card>
      ))}

      {/* Invite athlete modal → POST /api/parent/invite-athlete */}
      <InviteAthleteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={fetchAll} />
    </div>
  );
};

export default ParentDashboard;
