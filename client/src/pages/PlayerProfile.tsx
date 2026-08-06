import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { MapPin, CheckCircle2, MessageSquare, ArrowLeft, UserPlus, UserCheck, Trophy, Plus, X } from 'lucide-react';
import { tokens } from '../lib/tokens';
import { Button, Card, Stat, Badge } from '../components/ui';
import { variants, springs } from '../lib/motion';
import { useHaptics } from '../lib/haptics';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { ShareCard } from '../components/ShareCard';
import { toShareCard, type ShareCardData } from '../lib/shareCard';
import { apiFetch, errorMessage } from '../lib/api';

const { colors, text, type, radii } = tokens;

interface Player {
  id: number;
  name: string;
  position?: string;
  school?: string;
  state?: string;
  gradYear?: number;
  height?: string;
  weight?: string;
  bio?: string;
  gpa?: number;
  verified?: boolean;
  subscriptionTier?: string;
  g5Rating?: number | null;
  verificationStatus?: string;
}

interface GameStat {
  id: number;
  playerId: number;
  season?: string;
  touchdowns?: number;
  yards?: number;
  completionPct?: number;
  [key: string]: unknown;
}

function useCountUp(target: number, reduce: boolean, duration = 900): number {
  const [display, setDisplay] = useState(reduce ? target : 0);
  const rafId = useRef<number | null>(null);
  useEffect(() => {
    if (reduce) {
      rafId.current = requestAnimationFrame(() => setDisplay(target));
      return () => {
        if (rafId.current != null) cancelAnimationFrame(rafId.current);
      };
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t < 1) rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [target, reduce, duration]);
  return display;
}

function CountStat({ label, value }: { label: string; value: number }) {
  const reduce = useReducedMotion() ?? false;
  const shown = useCountUp(value, reduce);
  return <Stat label={label} value={<span className="tnum">{shown}</span>} />;
}

function Field({ label, value, onChange, placeholder, inputType = 'text', inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputType?: string; inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode']; }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: type.size.xs, fontWeight: type.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 }}>{label}</label>
      <input
        type={inputType}
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="k-input"
        style={{ width: '100%', background: colors.surface0, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '10px 12px', color: colors.textPrimary, fontSize: type.size.base, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );
}

function NumField({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode']; }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: type.size.xs, fontWeight: type.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 }}>{label}</label>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="k-input"
        style={{ width: '100%', background: colors.surface0, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '10px 12px', color: colors.textPrimary, fontSize: type.size.base, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );
}

export const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const haptics = useHaptics();
  const { showNotification } = useNotifications();
  const { user, isAuthenticated } = useAuth();
  const reduce = useReducedMotion() ?? false;
  const playerId = parseInt(id ?? '', 10);

  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<GameStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const [shareCardData, setShareCardData] = useState<ShareCardData | null>(null);
  const [exportingCard, setExportingCard] = useState(false);

  const [submitStatsOpen, setSubmitStatsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    season: '',
    position: '',
    passingTds: '',
    rushingTds: '',
    receivingTds: '',
    defensiveTds: '',
    sacks: '',
    fortyYardDash: '',
    verticalJump: '',
    shuttle5105: '',
    maxprepsUrl: '',
    notes: '',
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const onHeroPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setParallax({
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
    });
  }, [reduce]);
  const resetParallax = useCallback(() => setParallax({ x: 0, y: 0 }), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!id || isNaN(playerId)) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/athletes/${playerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setPlayer(data.data ?? data);
          else setNotFound(true);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }

      try {
        const sRes = await fetch(`/api/players/${playerId}/stats`);
        if (sRes.ok) {
          const body = await sRes.json();
          setStats(Array.isArray(body) ? body : []);
        }
      } catch { /* stats optional */ }

      try {
        const checkRes = await fetch(`/api/follows/check/${playerId}`, { credentials: 'include' });
        if (checkRes.ok) {
          const body = await checkRes.json();
          setFollowing(body?.data?.following ?? false);
        }
      } catch { /* not authed — ignore */ }

      try {
        const followersRes = await fetch(`/api/follows/followers/${playerId}`);
        if (followersRes.ok) {
          const body = await followersRes.json();
          setFollowerCount(Array.isArray(body?.data) ? body.data.length : 0);
        }
      } catch { /* optional */ }

      setLoading(false);
    };
    load();
  }, [playerId]);

  const toggleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    void haptics.press();
    try {
      if (following) {
        const res = await fetch(`/api/follows/${playerId}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
          setFollowing(false);
          setFollowerCount(c => Math.max(0, c - 1));
        }
      } else {
        const res = await fetch('/api/follows', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followingId: playerId }),
        });
        if (res.ok) {
          setFollowing(true);
          setFollowerCount(c => c + 1);
        }
      }
    } catch { /* ignore */ }
    finally { setFollowLoading(false); }
  };

  const handleMessage = () => {
    navigate('/messages', { state: { partnerId: player?.id, partnerName: player?.name } });
  };

  const submitStats = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        playerId,
        athleteName: player?.name ?? '',
        season: form.season || undefined,
        position: form.position || undefined,
        passingTds: form.passingTds ? Number(form.passingTds) : undefined,
        rushingTds: form.rushingTds ? Number(form.rushingTds) : undefined,
        receivingTds: form.receivingTds ? Number(form.receivingTds) : undefined,
        defensiveTds: form.defensiveTds ? Number(form.defensiveTds) : undefined,
        sacks: form.sacks ? Number(form.sacks) : undefined,
        fortyYardDash: form.fortyYardDash ? Number(form.fortyYardDash) : undefined,
        verticalJump: form.verticalJump ? Number(form.verticalJump) : undefined,
        shuttle5105: form.shuttle5105 ? Number(form.shuttle5105) : undefined,
        source: form.maxprepsUrl || undefined,
        notes: form.notes || undefined,
      };
      await apiFetch('/api/parent/stat-submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
      showNotification('success', 'Stats Submitted', 'Your submission is pending review.');
    } catch (err) {
      setSubmitError(errorMessage(err, 'Failed to submit stats. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const shareRatingCard = () => {
    if (exportingCard || !player) return;
    const card = toShareCard({
      name: player.name,
      position: player.position ?? '',
      school: player.school ?? '',
      g5Rating: player.g5Rating ?? null,
      verificationStatus: player.verified ? 'verified' : (player.verificationStatus ?? ''),
    });
    if (!card) {
      showNotification('info', 'No card yet', 'This athlete needs a HERS Rating before a card can be built.');
      return;
    }
    void haptics.press();
    setShareCardData(card);
    setExportingCard(true);
    requestAnimationFrame(async () => {
      try {
        const node = shareCardRef.current;
        if (!node) { setExportingCard(false); setShareCardData(null); return; }
        if (document.fonts && typeof document.fonts.ready?.then === 'function') {
          await document.fonts.ready;
        }
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#0E0E11' });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'hers-rating.png', { type: 'image/png' });
        const navAny = navigator as Navigator & {
          canShare?: (data: { files?: File[] }) => boolean;
          share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
        };
        if (navAny.share && navAny.canShare && navAny.canShare({ files: [file] })) {
          try {
            await navAny.share({ files: [file], title: 'HERS Rating', text: `${card.firstName}'s HERS365 rating card` });
          } catch { /* user cancelled the system sheet */ }
        } else {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'hers-rating.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch {
        showNotification('info', 'Card unavailable', "Couldn't build the image right now.");
      } finally {
        setExportingCard(false);
        setShareCardData(null);
      }
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: text.tertiary }}>
        <span className="auth-spinner" aria-hidden="true" />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (notFound || !player) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: text.tertiary }}>
        <p style={{ fontSize: type.size.lg, marginBottom: 16 }}>Player not found.</p>
        <Button variant="primary" onClick={() => navigate('/recruiting')}>Back to Recruiting</Button>
      </div>
    );
  }

  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.name || '')}`;
  const isVerified = player.verified ?? player.verificationStatus === 'verified';
  const hasRatingCard = player.g5Rating != null;
  const canSubmitStats = isAuthenticated && (user?.role === 'parent' || user?.role === 'admin');

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>

      <motion.button
        onClick={() => navigate(-1)}
        whileTap={reduce ? undefined : variants.press.whileTap}
        transition={springs.press}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: text.secondary, cursor: 'pointer', marginBottom: 20, fontSize: type.size.base, padding: 0 }}
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      <Card
        style={{ padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}
      >
        <div
          ref={heroRef}
          onPointerMove={onHeroPointerMove}
          onPointerLeave={resetParallax}
          style={{ position: 'relative' }}
        >
          <motion.div
            aria-hidden="true"
            animate={{ x: parallax.x * 14, y: parallax.y * 10 }}
            transition={springs.gentle}
            style={{
              position: 'absolute',
              top: -80,
              left: '18%',
              width: 320,
              height: 320,
              borderRadius: radii.full,
              background: 'radial-gradient(circle at center, rgba(139,59,255,0.28) 0%, rgba(139,59,255,0.08) 45%, transparent 72%)',
              filter: 'blur(6px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <motion.div
            aria-hidden="true"
            animate={{ x: parallax.x * -8, y: parallax.y * -6 }}
            transition={springs.gentle}
            style={{
              position: 'absolute',
              top: -40,
              right: '10%',
              width: 200,
              height: 200,
              borderRadius: radii.full,
              background: 'radial-gradient(circle at center, rgba(255,46,147,0.16) 0%, transparent 70%)',
              filter: 'blur(8px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
            <img src={avatarUrl} alt={player.name}
              style={{ width: 80, height: 80, borderRadius: radii.full, background: colors.surface2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontFamily: type.font.display, fontWeight: type.weight.bold, fontSize: type.size['2xl'], textTransform: 'uppercase', color: text.primary, margin: 0, letterSpacing: type.tracking.h1 }}>
                  {player.name}
                </h1>
                {isVerified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={18} color={colors.neonOn} fill={colors.neon} title="Verified Athlete" />
                    <Badge tone="neon" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>Verified MaxPreps</Badge>
                  </div>
                )}
              </div>
              {player.position && (
                <Badge tone="accent" style={{ marginBottom: 8 }}>{player.position}</Badge>
              )}
              {player.school && (
                <div style={{ fontSize: type.size.base, color: text.secondary, marginTop: 4 }}>{player.school}</div>
              )}
              {(player.state || player.gradYear) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: type.size.sm, color: text.tertiary }}>
                  {player.state && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{player.state}</span>}
                  {player.gradYear && <span>Class of {player.gradYear}</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <Button variant="primary" size="sm" onClick={handleMessage}>
                <MessageSquare size={15} /> Message
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFollow}
                disabled={followLoading}
                aria-pressed={following}
                style={{
                  background: following ? 'rgba(139,59,255,0.12)' : 'transparent',
                  color: following ? colors.accent : text.secondary,
                  border: `1px solid ${following ? 'rgba(139,59,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
                }}
              >
                {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                {following ? 'Following' : 'Follow'}
                <span style={{ color: text.tertiary, fontWeight: type.weight.regular }}>{followerCount}</span>
              </Button>
              {hasRatingCard && (
                <Button variant="ghost" size="sm" onClick={shareRatingCard} loading={exportingCard}>
                  {exportingCard ? 'Building…' : <><Trophy size={14} /> Rating Card</>}
                </Button>
              )}
            </div>
          </div>

          {player.bio && (
            <p style={{ color: text.secondary, fontSize: type.size.base, lineHeight: 1.6, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}>
              {player.bio}
            </p>
          )}
        </div>
      </Card>

      {(player.height || player.gpa != null || player.weight) && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontFamily: type.font.display, fontWeight: type.weight.bold, fontSize: type.size.md, textTransform: 'uppercase', color: text.tertiary, marginBottom: 16, letterSpacing: type.tracking.h2 }}>
            Athlete Info
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {player.height && <Stat label="Height" value={player.height} />}
            {player.gpa != null && <CountStat label="GPA" value={player.gpa} />}
            {player.weight && <Stat label="Weight" value={player.weight} />}
          </div>
        </Card>
      )}

      {(stats.length > 0 || canSubmitStats) && (
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: type.font.display, fontWeight: type.weight.bold, fontSize: type.size.md, textTransform: 'uppercase', color: text.tertiary, letterSpacing: type.tracking.h2, margin: 0 }}>
              Game Stats
            </h2>
            {canSubmitStats && (
              <Button variant="ghost" size="sm" onClick={() => setSubmitStatsOpen(true)}>
                <Plus size={14} /> Submit Stats
              </Button>
            )}
          </div>
          {stats.map((s, i) => (
            <div key={i} style={{ fontSize: type.size.base, color: text.secondary, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {s.season && <span style={{ color: colors.accent, marginRight: 8 }}>{s.season}</span>}
              {s.touchdowns !== undefined && <span style={{ marginRight: 12 }}>TDs: <b style={{ color: text.primary }}>{s.touchdowns}</b></span>}
              {s.yards !== undefined && <span style={{ marginRight: 12 }}>Yds: <b style={{ color: text.primary }}>{s.yards}</b></span>}
              {s.completionPct !== undefined && <span>Comp%: <b style={{ color: text.primary }}>{s.completionPct}%</b></span>}
            </div>
          ))}
          {stats.length === 0 && canSubmitStats && (
            <p style={{ fontSize: type.size.base, color: colors.textTertiary, margin: 0 }}>No stats recorded yet. Use the button above to submit game or combine data for review.</p>
          )}
        </Card>
      )}

      <AnimatePresence>
        {submitStatsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => !submitting && setSubmitStatsOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={springs.snappy}
              style={{ background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: '24px 20px', width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}
              onClick={e => e.stopPropagation()}>

              <button onClick={() => !submitting && setSubmitStatsOpen(false)} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: colors.textTertiary, padding: 4, lineHeight: 1 }} aria-label="Close">
                <X size={18} />
              </button>

              {submitted ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(139,59,255,0.12)', border: `1px solid ${colors.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <CheckCircle2 size={24} color={colors.accent} />
                  </div>
                  <div style={{ fontFamily: type.font.display, fontSize: type.size.xl, fontWeight: type.weight.bold, textTransform: 'uppercase', color: colors.textPrimary, marginBottom: 6 }}>Submitted for Review</div>
                  <p style={{ fontSize: type.size.base, color: colors.textSecondary, margin: '0 0 20px', lineHeight: 1.5 }}>
                    Thanks — a coach will verify these numbers and update the profile once confirmed.
                  </p>
                  <Button onClick={() => { setSubmitted(false); setSubmitStatsOpen(false); }}>Done</Button>
                </div>
              ) : (
                <form onSubmit={async e => { e.preventDefault(); await submitStats(); }}>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: type.size.xs, fontWeight: type.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.accent, marginBottom: 4 }}>Parent Stat Submission</div>
                    <div style={{ fontSize: type.size.sm, color: colors.textSecondary }}>Submit game / combine data for <span style={{ color: colors.textPrimary, fontWeight: type.weight.bold }}>{player.name}</span>.</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Field label="Season" value={form.season} onChange={v => setForm(f => ({ ...f, season: v }))} placeholder="e.g. Fall 2026" />
                      <Field label="Position" value={form.position} onChange={v => setForm(f => ({ ...f, position: v }))} placeholder="e.g. QB, WR" />
                    </div>

                    <div style={{ fontSize: type.size.xs, fontWeight: type.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginTop: 4 }}>Game Stats</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <NumField label="Pass TDs" value={form.passingTds} onChange={v => setForm(f => ({ ...f, passingTds: v }))} placeholder="0" />
                      <NumField label="Rush TDs" value={form.rushingTds} onChange={v => setForm(f => ({ ...f, rushingTds: v }))} placeholder="0" />
                      <NumField label="Rec TDs" value={form.receivingTds} onChange={v => setForm(f => ({ ...f, receivingTds: v }))} placeholder="0" />
                      <NumField label="Def TDs" value={form.defensiveTds} onChange={v => setForm(f => ({ ...f, defensiveTds: v }))} placeholder="0" />
                      <NumField label="Sacks" value={form.sacks} onChange={v => setForm(f => ({ ...f, sacks: v }))} placeholder="0" />
                    </div>

                    <div style={{ fontSize: type.size.xs, fontWeight: type.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginTop: 4 }}>Combine</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <NumField label="40 Yard" value={form.fortyYardDash} onChange={v => setForm(f => ({ ...f, fortyYardDash: v }))} placeholder="5.2" inputMode="decimal" />
                      <NumField label="Vertical" value={form.verticalJump} onChange={v => setForm(f => ({ ...f, verticalJump: v }))} placeholder="22" inputMode="decimal" />
                      <NumField label="Shuttle" value={form.shuttle5105} onChange={v => setForm(f => ({ ...f, shuttle5105: v }))} placeholder="4.8" inputMode="decimal" />
                    </div>

                    <Field label="MaxPreps / Source URL" value={form.maxprepsUrl} onChange={v => setForm(f => ({ ...f, maxprepsUrl: v }))} placeholder="https://www.maxpreps.com/..." />
                    <div>
                      <label style={{ display: 'block', fontSize: type.size.xs, fontWeight: type.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 }}>Verification Notes</label>
                      <textarea
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Describe the game, opponent, date, or how these stats were recorded..."
                        rows={3}
                        className="k-input"
                        style={{ width: '100%', background: colors.surface0, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '10px 12px', color: colors.textPrimary, fontSize: type.size.base, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>

                    {submitError && (
                      <div style={{ padding: '10px 12px', background: 'rgba(255,90,90,0.1)', border: `1px solid ${colors.borderStrong}`, borderRadius: radii.sm, color: colors.dangerText, fontSize: type.size.base }}>{submitError}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <Button variant="ghost" type="button" onClick={() => setSubmitStatsOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button type="submit" loading={submitting} disabled={submitting} className="flex-1">{submitting ? 'Submitting...' : 'Submit for Review'}</Button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {shareCardData && (
        <div aria-hidden="true" style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          <ShareCard ref={shareCardRef} data={shareCardData} />
        </div>
      )}

    </div>
  );
};