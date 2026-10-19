import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Check, X, ClipboardList, ChevronRight, Image, TrendingUp, School } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Button, Badge, EmptyState, RowSkeleton } from '../../components/ui';
import { RequestApprovalModal, type ApprovalRequest } from '../../components/parent/RequestApprovalModal';
import { demoHeadshot, MAYA_HEADSHOT } from '../../components/parent/demoImages';
import { isDemoParent } from '../../components/parent/demoParent';
import { useAuth } from '../../context/AuthContext';
import { colors, type as t } from '../../lib/tokens';

// Verifications / Approvals (Valerie's P.P - VERIFICATIONS / APPROVALS). Spec:
// output/parent-portal-spec/verifications.md. Frontend-only pass.
//
// Real data, wired: the coach-contact approval queue (GET /api/parent/requests +
// POST /api/parent/requests/:id/respond) and the parent stat submissions list
// (GET /api/parent/stat-submissions, read-only — those are reviewed by HERS staff,
// not approved by the parent, so no Approve/Deny here).
//
// NOT wired, shown honestly: the Guardian Gate status. The real guardian flow
// lives at /api/auth/guardian/* and writes guardianConsents, but there is no
// logged-in-parent read endpoint, so we render "not available yet" instead of
// faking the mockup's hardcoded "ACTIVE" (would be a fabricated security status
// for a minor). The mockup's photo / school pending items have no backend, so
// they are omitted rather than faked.

interface PendingMsg {
  id: number;
  from: string;
  role: string;
  org: string;
  preview: string;
  child: string;
  createdAt: string;
}

interface StatSubmission {
  id: number;
  athleteName: string | null;
  season: string | null;
  school: string | null;
  position: string | null;
  status: string | null;
  submittedAt: string | null;
}

interface HistoryEntry {
  id: string;
  label: string;
  action: 'approved' | 'denied' | 'pending';
  meta?: string;
  sample?: boolean;
}

// Real athlete change-request row from GET /api/parent/change-requests (the #4
// backend). Mapped to ApprovalRequest for the card/modal for non-demo parents.
interface ChangeReqRow {
  id: number;
  playerId: number;
  kind: 'photo' | 'stat' | 'school' | string;
  field: string | null;
  currentValue: string | null;
  proposedValue: string | null;
  status: string;
  note: string | null;
}

const CHANGE_REQ_SUBTITLES: Record<string, string> = {
  photo: 'Profile Photo Update',
  stat: 'Stat Correction',
  school: 'School Affiliation Change',
};

function mapChangeReq(row: ChangeReqRow, athleteName: string): ApprovalRequest {
  const subtitle = CHANGE_REQ_SUBTITLES[row.kind] ?? 'Profile Change';
  const description = row.note ?? `Requested update to ${row.field ?? 'profile'}.`;
  const kind = (['photo', 'stat', 'school'].includes(row.kind) ? row.kind : 'stat') as ApprovalRequest['kind'];
  if (kind === 'photo') {
    return {
      id: String(row.id), kind, subtitle, athleteName, description,
      current: { label: 'Current', img: row.currentValue ?? '' },
      next: { label: 'New', img: row.proposedValue ?? '' },
    };
  }
  return {
    id: String(row.id), kind, subtitle, athleteName, description,
    current: { label: 'Current', text: row.currentValue ?? '—' },
    next: { label: 'New', text: row.proposedValue ?? '—' },
  };
}

// --- Demo fallback content for the parent.maya demo credential. Shown ONLY when the
// real endpoint returns nothing, under a visible "Sample" badge; never presented as real.
// Pending rows use sentinel NEGATIVE ids so respond() resolves them locally and the real
// POST path is never hit for a fabricated coach request (minor-safety invariant). ---
const DEMO_PENDING: PendingMsg[] = [
  { id: -1, from: 'Coach Rivera', role: 'Head Coach', org: 'Keiser University', preview: "We loved Maya's film and would like to talk about our program.", child: 'Maya Thompson', createdAt: '' },
  { id: -2, from: 'Coach Daniels', role: 'Recruiting Coordinator', org: 'University of Oregon', preview: 'Interested in setting up a spring visit — please review.', child: 'Maya Thompson', createdAt: '' },
];
const DEMO_STATS: StatSubmission[] = [
  { id: -1, athleteName: 'Maya Thompson', season: '2025', school: 'Westlake HS', position: 'QB', status: 'reviewed', submittedAt: '2026-09-20' },
  { id: -2, athleteName: 'Maya Thompson', season: '2025', school: 'Westlake HS', position: 'QB', status: 'pending', submittedAt: '2026-09-28' },
];
const DEMO_HISTORY: HistoryEntry[] = [
  { id: 'demo-1', action: 'approved', label: 'Approved profile photo update', meta: 'Maya Thompson • 2 hours ago', sample: true },
  { id: 'demo-2', action: 'denied', label: 'Denied stat correction', meta: 'Maya Thompson • Yesterday', sample: true },
  { id: 'demo-3', action: 'pending', label: 'New stat submission received', meta: 'Maya Thompson • Yesterday', sample: true },
  { id: 'demo-4', action: 'approved', label: 'Approved school affiliation change', meta: 'Maya Thompson • 2 days ago', sample: true },
];

function statusTone(status: string | null): 'success' | 'neutral' {
  const s = (status || '').toLowerCase();
  return s === 'reviewed' || s === 'actioned' || s === 'accepted' ? 'success' : 'neutral';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// --- Presentational pieces (module scope: keeps the markup readable and avoids the
// "cannot create components during render" lint). ---

function CardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <h3 className="text-2xl font-[800] uppercase leading-none text-white" style={{ fontFamily: t.font.display }}>{title}</h3>
        {subtitle && <p className="mt-1.5 text-[13px] leading-snug" style={{ color: colors.textTertiary }}>{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: colors.accent }}>
      {n} Pending
    </span>
  );
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: colors.surface1, border: `1px solid ${colors.border}`, color: colors.textTertiary }}>
      {children}
    </span>
  );
}

// Three visibly distinct tones so approved / denied / pending never read the same.
const STATUS_TONES: Record<HistoryEntry['action'], { bg: string; border: string; color: string }> = {
  approved: { bg: 'rgba(139,59,255,0.12)', border: 'rgba(139,59,255,0.30)', color: colors.accentText },
  denied: { bg: 'rgba(255,90,90,0.12)', border: 'rgba(255,90,90,0.30)', color: colors.dangerText },
  pending: { bg: 'rgba(245,195,90,0.12)', border: 'rgba(245,195,90,0.30)', color: '#F5C35A' },
};
function StatusPill({ action }: { action: HistoryEntry['action'] }) {
  const s = STATUS_TONES[action];
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shrink-0" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {action}
    </span>
  );
}

// 48px rounded thumbnail used on the request rows (image or icon inside).
function RequestThumb({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: colors.surface2, border: '1px solid rgba(139,59,255,0.2)', color: colors.accentText }}>
      {children}
    </span>
  );
}

export const ParentVerifications = () => {
  const { user } = useAuth();
  // Only the designated demo account shows fabricated sample content; every other
  // parent sees real data or honest empty states (no fake coach contact about a minor).
  const demo = isDemoParent(user);
  const [requests, setRequests] = useState<PendingMsg[]>([]);
  const [stats, setStats] = useState<StatSubmission[]>([]);
  // Demo account only: seed the audit list with flagged sample history. Everyone else
  // starts empty; real in-session resolutions prepend above whatever is here.
  const [history, setHistory] = useState<HistoryEntry[]>(demo ? DEMO_HISTORY : []);
  const [resolvedDemoReqIds, setResolvedDemoReqIds] = useState<number[]>([]);
  const [acting, setActing] = useState<number | null>(null);
  const [actError, setActError] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Demo change-request popups (photo/stat/school) — see request-approval-popups.md.
  const [child, setChild] = useState<{ name: string; school: string | null }>({ name: 'Maya Thompson', school: 'Westlake HS' });
  const [resolvedChangeIds, setResolvedChangeIds] = useState<string[]>([]);
  const [changeReqRows, setChangeReqRows] = useState<ChangeReqRow[]>([]);
  const [activeRequest, setActiveRequest] = useState<ApprovalRequest | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [rData, sData, cData, chData] = await Promise.all([
        apiFetch('/api/parent/requests').catch(() => null),
        apiFetch('/api/parent/stat-submissions').catch(() => null),
        apiFetch('/api/parent/children').catch(() => null),
        apiFetch('/api/parent/change-requests').catch(() => null),
      ]);
      if (rData?.success && Array.isArray(rData.data)) setRequests(rData.data);
      if (sData?.success && Array.isArray(sData.data)) setStats(sData.data);
      if (cData?.success && Array.isArray(cData.data) && cData.data.length > 0) {
        const c = cData.data[0];
        setChild({ name: c.name ?? 'Maya Thompson', school: c.school ?? 'Westlake HS' });
      }
      if (chData?.success && Array.isArray(chData.data)) setChangeReqRows(chData.data);
    } catch (err) {
      console.error('[ParentVerifications] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Demo-only athlete-submitted change requests, keyed to the real child. No endpoint
  // backs these ([no-endpoint]); they are a flagged demo. Approve/Deny resolves locally.
  const changeRequests = useMemo<ApprovalRequest[]>(() => {
    const first = child.name.split(' ')[0];
    const school = child.school || 'Westlake HS';
    return [
      {
        id: 'cr-photo',
        kind: 'photo',
        subtitle: 'Profile Photo Update',
        athleteName: child.name,
        description: `${first} uploaded a new profile photo for her athlete profile. Review the proposed image before approving the change.`,
        current: { label: 'Current', img: MAYA_HEADSHOT },
        next: { label: 'New', img: demoHeadshot(1) },
      },
      {
        id: 'cr-stat',
        kind: 'stat',
        subtitle: 'Stat Correction',
        athleteName: child.name,
        description: `A request to update ${first}'s 40-yard dash time from 5.8s to 5.6s. Review the change before approving.`,
        current: { label: 'Current', text: '5.8s' },
        next: { label: 'New', text: '5.6s' },
      },
      {
        id: 'cr-school',
        kind: 'school',
        subtitle: 'School Affiliation Change',
        athleteName: child.name,
        description: `Request to update school affiliation from ${school} to Northside Prep. Review the change before approving.`,
        current: { label: 'Current', text: school },
        next: { label: 'New', text: 'Northside Prep' },
      },
    ];
  }, [child]);

  // demo: fabricated popups (no endpoint). non-demo: real pending change requests from
  // GET /change-requests, mapped for the card/modal. Optimistically hidden via
  // resolvedChangeIds once the parent responds.
  const pendingChanges = demo
    ? changeRequests.filter(r => !resolvedChangeIds.includes(r.id))
    : changeReqRows
        .filter(r => r.status === 'pending' && !resolvedChangeIds.includes(String(r.id)))
        .map(r => mapChangeReq(r, child.name));

  const resolveChange = async (req: ApprovalRequest, action: 'approve' | 'deny') => {
    // Real (non-demo) rows hit the backend; demo sample rows resolve locally only.
    if (!demo) {
      const res = await apiFetch<{ success: boolean }>(`/api/parent/change-requests/${req.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }).catch(() => null);
      if (!res?.success) return; // leave the row pending on failure, never fake a resolution
    }
    setResolvedChangeIds(prev => [...prev, req.id]);
    setActiveRequest(null);
    setHistory(prev => [
      {
        id: `${req.id}-${action}`,
        action: action === 'approve' ? 'approved' : 'denied',
        label: `${action === 'approve' ? 'Approved' : 'Denied'} ${req.subtitle.toLowerCase()}`,
        meta: `${child.name} • Just now`,
        sample: demo,
      },
      ...prev,
    ]);
  };

  const changeIcon = (kind: ApprovalRequest['kind']) =>
    kind === 'photo' ? <Image size={16} /> : kind === 'stat' ? <TrendingUp size={16} /> : <School size={16} />;

  // Demo fallback: demo account only, and only when the real fetch came back empty
  // (never mixed with real rows, never shown to a real parent).
  const requestsDemo = demo && !loading && requests.length === 0;
  const shownRequests = requestsDemo ? DEMO_PENDING.filter(r => !resolvedDemoReqIds.includes(r.id)) : requests;
  const statsDemo = demo && !loading && stats.length === 0;
  const shownStats = statsDemo ? DEMO_STATS : stats;

  const respond = async (req: PendingMsg, action: 'approve' | 'reject') => {
    // Demo rows (sentinel negative id) resolve locally — never POST a fabricated
    // coach request to the real endpoint. The real path below is untouched for real rows.
    if (req.id < 0) {
      setResolvedDemoReqIds(prev => [...prev, req.id]);
      setHistory(prev => [
        {
          id: `demo-req-${req.id}-${action}`,
          action: action === 'approve' ? 'approved' : 'denied',
          label: `${action === 'approve' ? 'Approved' : 'Denied'} message request from ${req.from}`,
          meta: `${req.child || 'Just now'} • Just now`,
          sample: true,
        },
        ...prev,
      ]);
      return;
    }
    setActing(req.id);
    setActError(null);
    try {
      // Gate every mutation on a confirmed response. Removing the row or writing a
      // history line after a failed POST would be a fabricated audit entry on a
      // minor's coach-contact queue, which CLAUDE.md flags as off-limits.
      const res = await apiFetch<{ success: boolean }>(`/api/parent/requests/${req.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }).catch(() => null);
      if (!res?.success) {
        setActError(req.id);
        return;
      }
      setRequests(prev => prev.filter(r => r.id !== req.id));
      // Real, in-session audit: record what the parent just resolved. We do not
      // fabricate a pre-existing history (no audit read endpoint exists yet).
      setHistory(prev => [
        {
          id: `${req.id}-${action}`,
          action: action === 'approve' ? 'approved' : 'denied',
          label: `${action === 'approve' ? 'Approved' : 'Denied'} message request from ${req.from}`,
          meta: `${req.child || ''} • Just now`,
        },
        ...prev,
      ]);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Hero — full-width title reads straight across; the compact Guardian Gate chip sits
          top-right at 2xl (where there's room) and stacks under the title on narrower screens
          so the title never wraps mid-phrase. */}
      <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-[800] uppercase leading-[0.9] tracking-tight text-white" style={{ fontFamily: t.font.display }}>
            Verification <span style={{ color: colors.accent }}>/ Approvals</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed max-w-2xl" style={{ color: colors.textSecondary }}>
            Review and approve contact requests before they reach your child, and keep track of
            stat submissions sent in for review.
          </p>
        </div>

        {/* Guardian Gate — honest status (no fabricated "ACTIVE"); compact so it fits beside the title. */}
        <div className="2xl:w-[240px] shrink-0 rounded-2xl p-4" style={{ background: 'rgba(139,59,250,0.10)', border: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} style={{ color: colors.textTertiary }} />
            <span className="text-[0.7rem] font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>
              Guardian Gate Status
            </span>
          </div>
          <div className="mt-2 text-xl font-[800] leading-none" style={{ fontFamily: t.font.display, color: colors.textSecondary }}>
            Not available yet
          </div>
          <p className="mt-1.5 text-[0.7rem] leading-snug" style={{ color: colors.textTertiary }}>
            Handled over the emailed consent link.
          </p>
        </div>
      </div>

      {/* Two balanced columns. Left: the action-heavy approval queues. Right: activity + stat log. */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <div className="space-y-6">
      {/* Pending Message Requests — coach-contact queue (real; demo fallback when empty) */}
      <Card className="p-6">
        <CardHead
          title="Pending Message Requests"
          subtitle="Approve or deny coach messages before they reach your child's account."
          right={!loading && shownRequests.length > 0
            ? <div className="flex items-center gap-2">{requestsDemo && <Badge tone="neutral">Sample</Badge>}<CountBadge n={shownRequests.length} /></div>
            : undefined}
        />
        {loading ? (
          <div className="space-y-1">{Array.from({ length: 2 }).map((_, i) => <RowSkeleton key={i} />)}</div>
        ) : shownRequests.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={<Check size={28} />}
            title="All caught up"
            body="No message requests right now. Coach requests will appear here for your review."
          />
        ) : (
          <ul className="space-y-3">
            {shownRequests.map(req => (
              <motion.li key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-4"
                  style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}
                >
                  <RequestThumb><img src={demoHeadshot(Math.abs(req.id) + 1)} alt="" className="w-full h-full object-cover" /></RequestThumb>
                  <div className="min-w-0 sm:w-[168px] sm:shrink-0">
                    <p className="text-sm font-bold text-white truncate">{req.from}</p>
                    <p className="text-xs truncate" style={{ color: colors.textTertiary }}>{req.role}{req.org ? ` · ${req.org}` : ''}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug text-white/90">&ldquo;{req.preview}&rdquo;</p>
                    {req.child && <p className="mt-1 text-xs" style={{ color: colors.textTertiary }}>Requesting contact with {req.child}</p>}
                    {actError === req.id && <p className="mt-1 text-xs" style={{ color: colors.dangerText }}>Couldn&rsquo;t save that. Still pending, try again.</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="primary" loading={acting === req.id} onClick={() => respond(req, 'approve')} aria-label="Approve"><Check size={15} /> Approve</Button>
                    <Button size="sm" variant="ghost" disabled={acting === req.id} onClick={() => respond(req, 'reject')} aria-label="Deny"><X size={15} /> Deny</Button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      {/* Profile Change Requests — demo shows the fabricated popups; real users see their
          real change requests (GET /change-requests) or an honest empty state. Always
          present so a new user sees the card, not a missing section. */}
      <Card className="p-6">
        <CardHead
          title="Profile Change Requests"
          subtitle={demo
            ? 'Changes your athlete requested. Review each before it goes live. Demo only, nothing publishes yet.'
            : 'Changes your athlete requested. Review and approve each before it goes live.'}
          right={demo
            ? (pendingChanges.length > 0
                ? <div className="flex items-center gap-2"><Badge tone="neutral">Sample</Badge><CountBadge n={pendingChanges.length} /></div>
                : <Badge tone="neutral">Sample</Badge>)
            : (pendingChanges.length > 0 ? <CountBadge n={pendingChanges.length} /> : undefined)}
        />
        {pendingChanges.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={<Check size={28} />}
            title="All reviewed"
            body="No profile change requests waiting. New ones from your athlete will show here."
          />
        ) : (
          <ul className="space-y-3">
            {pendingChanges.map(req => (
              <motion.li key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <button
                  type="button"
                  onClick={() => setActiveRequest(req)}
                  className="group w-full flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-4 text-left transition-colors hover:bg-white/[0.03]"
                  style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}
                >
                  <RequestThumb>
                    {req.kind === 'photo' && 'img' in req.current
                      ? <img src={req.current.img} alt="" className="w-full h-full object-cover" />
                      : changeIcon(req.kind)}
                  </RequestThumb>
                  <div className="min-w-0 sm:w-[168px] sm:shrink-0">
                    <p className="text-sm font-bold text-white truncate">{req.subtitle}</p>
                    <p className="text-xs truncate" style={{ color: colors.textTertiary }}>Submitted by {req.athleteName}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug text-white/90 line-clamp-2">{req.description}</p>
                    <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Pending approval</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider" style={{ color: colors.accentText }}>
                    Review <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
        </div>

        <div className="space-y-6">
      {/* Recent Activity — each entry boxed with a distinct status pill. Seeded demo + session actions. */}
      <Card className="p-6">
        <CardHead
          title="Recent Activity"
          subtitle="Latest approvals, denials, and submissions. Your actions this session appear at the top."
          right={<div className="flex items-center gap-2">{history.some(h => h.sample) && <Badge tone="neutral">Sample</Badge>}<MetaPill>Last 7 days</MetaPill></div>}
        />
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: colors.textTertiary }}>Nothing yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map(h => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl p-3.5"
                style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white truncate">{h.label}</p>
                  {h.meta && <p className="mt-0.5 text-xs truncate" style={{ color: colors.textTertiary }}>{h.meta}</p>}
                </div>
                <StatusPill action={h.action} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Stat Submissions — REAL, read-only (HERS-reviewed, not parent-approved); demo fallback. */}
      <Card className="p-6">
        <CardHead
          title="Stat Submissions"
          subtitle="Stats you submit are reviewed by HERS staff before they publish — not approved here."
          right={statsDemo ? <Badge tone="neutral">Sample</Badge> : undefined}
        />
        {loading ? (
          <div className="space-y-1">{Array.from({ length: 2 }).map((_, i) => <RowSkeleton key={i} />)}</div>
        ) : shownStats.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={<ClipboardList size={28} />}
            title="No submissions yet"
            body="Stats you submit from My Athletes will show here with their review status."
          />
        ) : (
          <ul className="space-y-3">
            {shownStats.map(s => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl p-3.5"
                style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {s.athleteName || 'Athlete'}
                    {s.season ? ` · ${s.season}` : ''}
                  </p>
                  <p className="text-xs truncate" style={{ color: colors.textTertiary }}>
                    {[s.position, s.school].filter(Boolean).join(' · ')}
                    {fmtDate(s.submittedAt) ? ` · ${fmtDate(s.submittedAt)}` : ''}
                  </p>
                </div>
                <Badge tone={statusTone(s.status)} className="shrink-0 capitalize">
                  {s.status || 'pending'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
        </div>
      </div>

      <RequestApprovalModal
        request={activeRequest}
        onClose={() => setActiveRequest(null)}
        onResolve={resolveChange}
      />
    </div>
  );
};

export default ParentVerifications;
