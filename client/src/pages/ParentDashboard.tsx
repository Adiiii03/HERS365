import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, MessageSquare, Activity, Bell, CheckCircle2, XCircle, ChevronRight, Lock, Inbox, EyeOff } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useNotifications } from '../context/NotificationContext';
import { useHaptics } from '../lib/haptics';
import { tokens } from '../lib/tokens';
import { Button, Card, Badge, EmptyState, CardSkeleton, RowSkeleton } from '../components/ui';

const { colors, text, type, radii } = tokens;

type Tab = 'overview' | 'messages' | 'activity' | 'settings';

type Child = { id: number; name: string; age: number | null; school: string | null; position: string | null; gradYear: number | null };
type PendingMsg = { id: number; from: string; role: string; org: string; preview: string; child: string; createdAt: string };
type ActivityItem = { text: string; ts: string; type: 'message' };

const SETTING_DEFS = [
  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Get emailed when a coach sends a message request', defaultOn: true },
  { key: 'smsAlerts',           label: 'SMS Alerts',           desc: 'Text message alerts for urgent approvals',         defaultOn: false },
  { key: 'profileVisibility',   label: 'Profile Visibility',   desc: "Allow athlete's profile to appear in coach searches", defaultOn: true },
  { key: 'rankingVisibility',   label: 'Ranking Visibility',   desc: 'Include athlete in public HERS365 rankings',       defaultOn: true },
] as const;

type SettingKey = (typeof SETTING_DEFS)[number]['key'];
type Prefs = Record<SettingKey, boolean>;

const DEFAULT_PREFS: Prefs = SETTING_DEFS.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.defaultOn }),
  {} as Prefs,
);

const SettingRow = ({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
    <div>
      <div style={{ fontWeight: type.weight.bold, fontSize: type.size.base, color: text.primary, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: type.size.xs, color: text.secondary }}>{desc}</div>
    </div>
    <motion.div
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      className="parent-switch"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
      }}
      style={{ width: 40, height: 22, borderRadius: radii.full, background: on ? colors.accent : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
    >
      <motion.div animate={{ x: on ? 20 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} style={{ width: 18, height: 18, borderRadius: radii.full, background: colors.accentOn, position: 'absolute', top: 2 }} />
      <style>{`.parent-switch:focus-visible{outline:2px solid ${colors.accent};outline-offset:3px}.parent-switch::before{content:'';position:absolute;top:-11px;bottom:-11px;left:0;right:0}`}</style>
    </motion.div>
  </div>
);

// Server-backed parent settings, lifted to ParentDashboard so the child safety
// chips and the Settings tab read the same source. PUTs a partial diff on every
// toggle; optimistic UI reverts on failure (settings are non-critical).
const SettingsPanel = ({ prefs, setPrefs }: { prefs: Prefs; setPrefs: React.Dispatch<React.SetStateAction<Prefs>> }) => {
  const toggle = async (key: SettingKey) => {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    try {
      await apiFetch('/api/parent/settings', {
        method: 'PUT',
        body: JSON.stringify({ [key]: next }),
      });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !next })); // revert
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {SETTING_DEFS.map((s) => (
        <SettingRow key={s.key} label={s.label} desc={s.desc} on={prefs[s.key]} onToggle={() => toggle(s.key)} />
      ))}
    </div>
  );
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return '1d ago';
  return `${diffD}d ago`;
}

// Each child's safety chips derive from the parent's real, server-backed
// settings. Coach Contact is always parent gated — the app's core safety
// invariant, never a coach-reachable-directly state. Profile and ranking
// visibility read the persisted prefs, falling back to their defaults when
// the setting is absent from the server payload.
function childChips(prefs: Prefs) {
  return [
    prefs.profileVisibility
      ? { label: 'Profile Visible', val: 'Public', ok: true }
      : { label: 'Profile Visible', val: 'Hidden', ok: false },
    { label: 'Coach Contact', val: 'Parent Gated', ok: true },
    prefs.rankingVisibility
      ? { label: 'Rankings', val: 'Public', ok: true }
      : { label: 'Rankings', val: 'Off', ok: false },
  ];
}

export const ParentDashboard = () => {
  const { showNotification } = useNotifications();
  const haptics = useHaptics();
  const [tab, setTab] = useState<Tab>('overview');
  const [children, setChildren] = useState<Child[]>([]);
  const [requests, setRequests] = useState<PendingMsg[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [recentActions, setRecentActions] = useState<{ id: number; from: string; action: 'approved' | 'rejected' }[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [cData, rData, aData, sData] = await Promise.all([
        apiFetch('/api/parent/children').catch(() => null),
        apiFetch('/api/parent/requests').catch(() => null),
        apiFetch('/api/parent/activity').catch(() => null),
        apiFetch('/api/parent/settings').catch(() => null),
      ]);
      if (cData?.success) setChildren(Array.isArray(cData.data) ? cData.data : []);
      if (rData?.success) setRequests(Array.isArray(rData.data) ? rData.data : []);
      if (aData?.success) setActivity(Array.isArray(aData.data) ? aData.data : []);
      if (sData?.success) setPrefs((p) => ({ ...p, ...(sData.data as Partial<Prefs>) }));
    } catch (err) {
      console.error('[ParentDashboard] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const respond = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    const req = requests.find((r) => r.id === id);
    try {
      const data = await apiFetch(`/api/parent/requests/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }).catch(() => null);
      if (data?.success) {
        if (req) {
          setRecentActions((prev) => [...prev, { id, from: req.from, action: action === 'approve' ? 'approved' : 'rejected' }]);
        }
        setRequests((prev) => prev.filter((r) => r.id !== id));
        if (action === 'approve') {
          haptics.notify();
          showNotification('success', 'Approved', `${req?.from ?? 'The coach'} can now message ${req?.child ?? 'your athlete'}.`);
        } else {
          haptics.press();
          showNotification('info', 'Denied', `${req?.from ?? 'This coach'} is blocked from messaging ${req?.child ?? 'your athlete'}.`);
        }
      } else {
        haptics.press();
        showNotification('error', 'Something went wrong', "We couldn't record your response. Please try again.");
      }
    } catch (err) {
      console.error('[ParentDashboard] respond error', err);
      haptics.press();
      showNotification('error', 'Something went wrong', "We couldn't record your response. Please try again.");
    } finally {
      setActing(null);
    }
  };

  const chips = childChips(prefs);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: type.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>
          <Shield size={13} /> PARENT PORTAL
        </div>
        <h1 style={{ fontFamily: type.font.display, fontSize: type.size['3xl'], fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: type.tracking.h2, margin: '0 0 6px', lineHeight: 1 }}>Parent Dashboard</h1>
        <p style={{ color: text.secondary, fontSize: type.size.base, margin: 0 }}>You control your athlete's communication and privacy settings.</p>
      </div>

      {/* Safety banner */}
      <div style={{ background: 'rgba(74,222,128,0.07)', border: `1px solid rgba(74,222,128,0.2)`, borderRadius: radii.md, padding: '12px 16px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Lock size={14} color={colors.success} />
        <span style={{ fontSize: type.size.sm, color: colors.successText }}>All coach-to-athlete communication is gated through this dashboard. No messages reach your athlete without your approval.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { id: 'overview', label: 'Overview', icon: <Activity size={13} /> },
          { id: 'messages', label: `Messages${requests.length ? ` (${requests.length})` : ''}`, icon: <MessageSquare size={13} /> },
          { id: 'activity', label: 'Activity', icon: <Bell size={13} /> },
          { id: 'settings', label: 'Settings', icon: <Users size={13} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', borderRadius: radii.full, border: 'none', cursor: 'pointer',
            background: tab === t.id ? colors.accent : 'rgba(255,255,255,0.05)',
            color: tab === t.id ? colors.accentOn : text.secondary,
            fontSize: type.size.xs, fontWeight: type.weight.bold, display: 'flex', alignItems: 'center', gap: 5,
          }}>{t.icon}{t.label}</motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {loading ? (
              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                {children.length === 0 ? (
                  <EmptyState
                    icon={<Users size={32} />}
                    title="No athletes linked yet"
                    body="No athletes are linked to your account."
                  />
                ) : children.map((c) => (
                  <Card key={c.id} style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: type.font.display, fontSize: type.size.xl, fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: type.tracking.h2 }}>{c.name}</div>
                        <div style={{ fontSize: type.size.sm, color: text.secondary, marginTop: 3 }}>
                          {[c.position, c.school, c.gradYear ? `Class of ${c.gradYear}` : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {c.age != null && (
                        <Badge tone="accent" style={{ padding: '6px 10px' }}>
                          <span style={{ fontFamily: type.font.display, fontSize: type.size.md, fontWeight: type.weight.bold }}>Age {c.age}</span>
                        </Badge>
                      )}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {chips.map((s) => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: s.ok ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.05)', border: `1px solid ${s.ok ? 'rgba(74,222,128,0.15)' : colors.border}`, borderRadius: radii.full }}>
                          {s.ok ? <CheckCircle2 size={11} color={colors.success} /> : <EyeOff size={11} color={text.tertiary} />}
                          <span style={{ fontSize: '0.65rem', color: s.ok ? colors.successText : text.secondary, fontWeight: type.weight.bold }}>{s.label}: {s.val}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {requests.length > 0 && (
              <button type="button" onClick={() => setTab('messages')} style={{ width: '100%', textAlign: 'left', background: 'rgba(245,158,11,0.06)', border: `1px solid rgba(245,158,11,0.19)`, borderRadius: radii.md, padding: '14px 16px', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bell size={16} color={colors.pink} />
                  <div>
                    <div style={{ fontSize: type.size.base, fontWeight: type.weight.bold, color: colors.pinkText }}>{requests.length} message{requests.length > 1 ? 's' : ''} awaiting your approval</div>
                    <div style={{ fontSize: type.size.xs, color: text.secondary }}>Review before {requests[0].child} can receive them</div>
                  </div>
                </div>
                <ChevronRight size={16} color={colors.pink} />
              </button>
            )}
          </motion.div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <p style={{ color: text.secondary, fontSize: type.size.sm, marginBottom: 18, lineHeight: 1.6 }}>Coaches can contact your athlete only after you approve each request. Denied requests are blocked permanently from that coach.</p>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Card style={{ padding: '18px 20px' }}>
                  <RowSkeleton />
                </Card>
                <Card style={{ padding: '18px 20px' }}>
                  <RowSkeleton />
                </Card>
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={32} color={colors.success} />}
                title="You're all caught up"
                body="No pending message requests."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {requests.map((m) => (
                  <Card key={m.id} style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: type.weight.bold, fontSize: type.size.md, color: text.primary }}>{m.from}</div>
                        <div style={{ fontSize: type.size.xs, color: text.secondary }}>{[m.role, m.org].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: text.tertiary, flexShrink: 0 }}>{formatTs(m.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: type.size.sm, color: text.primary, lineHeight: 1.5, marginBottom: 4, fontStyle: 'italic' }}>"{(m.preview ?? '').slice(0, 100)}{(m.preview ?? '').length > 100 ? '…' : ''}"</div>
                    <div style={{ fontSize: '0.7rem', color: text.tertiary, marginBottom: 14 }}>To: {m.child}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Button
                        variant="ghost"
                        loading={acting === m.id}
                        disabled={acting === m.id}
                        onClick={() => respond(m.id, 'approve')}
                        style={{ flex: 1, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: colors.success }}
                      >
                        <CheckCircle2 size={13} /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        loading={acting === m.id}
                        disabled={acting === m.id}
                        onClick={() => respond(m.id, 'reject')}
                        style={{ flex: 1, background: 'rgba(255,90,90,0.1)', border: `1px solid rgba(255,90,90,0.25)`, color: colors.danger }}
                      >
                        <XCircle size={13} /> Deny
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {recentActions.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: '0.65rem', color: text.tertiary, fontWeight: type.weight.bold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recent Actions</div>
                {recentActions.map(({ id, from, action }) => (
                  <div key={id} style={{ fontSize: type.size.sm, color: action === 'approved' ? colors.successText : colors.dangerText, marginBottom: 4 }}>
                    {action === 'approved' ? '✓ Approved' : '✗ Denied'}: {from}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ACTIVITY */}
        {tab === 'activity' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                icon={<Inbox size={32} />}
                title="Nothing here yet"
                body="No recent activity."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activity.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}`, borderRadius: radii.sm }}>
                    <div style={{ width: 8, height: 8, borderRadius: radii.full, background: colors.pink, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: type.size.base, color: text.primary, lineHeight: 1.4 }}>{a.text}</div>
                      <div style={{ fontSize: '0.7rem', color: text.tertiary, marginTop: 3 }}>{formatTs(a.ts)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SettingsPanel prefs={prefs} setPrefs={setPrefs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
