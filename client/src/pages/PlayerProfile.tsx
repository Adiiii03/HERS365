import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, CheckCircle2, MessageSquare, ArrowLeft, UserPlus, UserCheck, Trophy } from 'lucide-react';
import { tokens } from '../lib/tokens';
import { Button, Card, Stat, Badge, Input, Sheet } from '../components/ui';
import { variants, springs } from '../lib/motion';
import { useHaptics } from '../lib/haptics';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { ShareCard } from '../components/ShareCard';
import { toShareCard, type ShareCardData } from '../lib/shareCard';

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

// Count up a numeric value once on first mount. Reduced motion → instant final.
// setState is deferred into the rAF callback so the effect body stays
// setState-free (react-hooks/set-state-in-effect).
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

export const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const haptics = useHaptics();
  const { showNotification } = useNotifications();
  const { user, token } = useAuth();
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

  // Parent Stat Submission Modal State
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [parentSubmitting, setParentSubmitting] = useState(false);
  const [parentFormData, setParentFormData] = useState({
    season: '2026',
    maxPrepsUrl: '',
    passingTds: '',
    rushingTds: '',
    receivingTds: '',
    passingYards: '',
    rushingYards: '',
    receivingYards: '',
    flagPulls: '',
    interceptions: '',
    sacks: '',
    fortyYardDash: '',
    verticalJump: '',
    shuttle5105: '',
    broadJump: '',
    notes: '',
  });

  const handleParentStatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParentSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        playerId,
        season: parentFormData.season || '2026',
      };
      if (parentFormData.maxPrepsUrl) payload.maxPrepsUrl = parentFormData.maxPrepsUrl;
      if (parentFormData.notes) payload.notes = parentFormData.notes;

      const numFields = [
        'passingTds', 'rushingTds', 'receivingTds', 'sacks',
        'passingYards', 'rushingYards', 'receivingYards', 'flagPulls', 'interceptions',
        'fortyYardDash', 'verticalJump', 'shuttle5105', 'broadJump'
      ];
      for (const field of numFields) {
        const val = (parentFormData as any)[field];
        if (val !== '' && val != null) {
          const n = Number(val);
          if (!isNaN(n)) payload[field] = n;
        }
      }

      const res = await fetch('/api/parent/stats/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        showNotification('Submission Received', 'Your stats & MaxPreps URL have been sent to our moderation queue for verification.', 'success');
        setIsParentModalOpen(false);
        setParentFormData({
          season: '2026',
          maxPrepsUrl: '',
          passingTds: '',
          rushingTds: '',
          receivingTds: '',
          passingYards: '',
          rushingYards: '',
          receivingYards: '',
          flagPulls: '',
          interceptions: '',
          sacks: '',
          fortyYardDash: '',
          verticalJump: '',
          shuttle5105: '',
          broadJump: '',
          notes: '',
        });
      } else {
        showNotification('Submission Failed', data?.error || 'Could not submit stats. Please check fields and try again.', 'error');
      }
    } catch {
      showNotification('Error', 'Network error while submitting stats.', 'error');
    } finally {
      setParentSubmitting(false);
    }
  };

  // Signature #2: subtle pointer parallax on the hero bloom. Reduced motion
  // pins it dead center. Values are normalized -1..1 off the header midpoint.
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
        const sRes = await fetch(`/api/athletes/${playerId}/stats`);
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

  // Premium ShareCard trigger — reuses the existing off-screen export (Profile
  // uses the identical flow). Fail-closed on a missing rating; PII stays inside
  // toShareCard's allow-list.
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
  const hasRatingCard = player.g5Rating != null;

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>

      {/* Back */}
      <motion.button
        onClick={() => navigate(-1)}
        whileTap={reduce ? undefined : variants.press.whileTap}
        transition={springs.press}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: text.secondary, cursor: 'pointer', marginBottom: 20, fontSize: type.size.base, padding: 0 }}
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      {/* Header — signature #2: gradient depth + pointer parallax on the hero bloom */}
      <Card
        style={{ padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}
      >
        <div
          ref={heroRef}
          onPointerMove={onHeroPointerMove}
          onPointerLeave={resetParallax}
          style={{ position: 'relative' }}
        >
          {/* Depth bloom — same palette DNA as the ShareCard. Parallax nudges it. */}
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
                {(player.verified || player.verificationStatus === 'verified') && (
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

      {/* Quick stats — Barlow numerals count up on first view (signature #2) */}
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

      {/* Stats from API & Parent Submission Action */}
      {(stats.length > 0 || user?.role === 'parent' || user?.role === 'admin') && (
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: type.font.display, fontWeight: type.weight.bold, fontSize: type.size.md, textTransform: 'uppercase', color: text.tertiary, margin: 0, letterSpacing: type.tracking.h2 }}>
                Game Stats & Combine
              </h2>
              {(player.verified || player.verificationStatus === 'verified') && (
                <Badge tone="neon">Admin Verified</Badge>
              )}
            </div>
            {(user?.role === 'parent' || user?.role === 'admin') && (
              <Button variant="outline" size="sm" onClick={() => setIsParentModalOpen(true)}>
                + Submit Stats & MaxPreps URL
              </Button>
            )}
          </div>

          {stats.length > 0 ? (
            stats.map((s, i) => (
              <div key={i} style={{ fontSize: type.size.base, color: text.secondary, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 8 }}>
                {s.season && <span style={{ color: colors.accent }}>Season: <b style={{ color: text.primary }}>{s.season}</b></span>}
                {(s.passingTds !== undefined || s.touchdowns !== undefined) && <span>Pass TDs: <b style={{ color: text.primary }}>{s.passingTds ?? s.touchdowns}</b></span>}
                {s.rushingTds !== undefined && <span>Rush TDs: <b style={{ color: text.primary }}>{s.rushingTds}</b></span>}
                {s.receivingTds !== undefined && <span>Rec TDs: <b style={{ color: text.primary }}>{s.receivingTds}</b></span>}
                {(s.passingYards !== undefined || s.yards !== undefined) && <span>Pass Yds: <b style={{ color: text.primary }}>{s.passingYards ?? s.yards}</b></span>}
                {s.rushingYards !== undefined && <span>Rush Yds: <b style={{ color: text.primary }}>{s.rushingYards}</b></span>}
                {s.receivingYards !== undefined && <span>Rec Yds: <b style={{ color: text.primary }}>{s.receivingYards}</b></span>}
                {s.flagPulls !== undefined && <span>Flag Pulls: <b style={{ color: text.primary }}>{s.flagPulls}</b></span>}
                {s.interceptionsCaught !== undefined && <span>INTs: <b style={{ color: text.primary }}>{s.interceptionsCaught}</b></span>}
                {s.completionPct !== undefined && <span>Comp%: <b style={{ color: text.primary }}>{s.completionPct}%</b></span>}
              </div>
            ))
          ) : (
            <p style={{ color: text.tertiary, fontSize: type.size.sm, margin: 0, padding: '8px 0' }}>
              No verified game stats recorded for this athlete yet. Click "+ Submit Stats & MaxPreps URL" above to submit official stats and your MaxPreps profile for moderation review.
            </p>
          )}
        </Card>
      )}

      {/* Parent Stat Submission Modal Sheet */}
      <Sheet open={isParentModalOpen} onClose={() => setIsParentModalOpen(false)} label="Parent Stat Submission">
        <form onSubmit={handleParentStatSubmit} className="flex flex-col gap-4 max-h-[72vh] overflow-y-auto pr-1">
          <div>
            <h3 style={{ fontFamily: type.font.display, fontWeight: type.weight.bold, fontSize: type.size.lg, textTransform: 'uppercase', color: text.primary, margin: 0 }}>
              Submit Verified Athlete Stats
            </h3>
            <p style={{ color: text.tertiary, fontSize: type.size.xs, marginTop: 4 }}>
              Input verified season performance and attach your MaxPreps profile link. Verified submissions unlock official ranking verification and badges.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FF2E93]">1. Source & Profile</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Season"
                value={parentFormData.season}
                onChange={(e) => setParentFormData({ ...parentFormData, season: e.target.value })}
                placeholder="2026"
              />
              <Input
                label="MaxPreps Athlete URL"
                value={parentFormData.maxPrepsUrl}
                onChange={(e) => setParentFormData({ ...parentFormData, maxPrepsUrl: e.target.value })}
                placeholder="https://maxpreps.com/athlete/..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B3BFF]">2. Touchdowns & Yards</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Passing TDs"
                type="number"
                value={parentFormData.passingTds}
                onChange={(e) => setParentFormData({ ...parentFormData, passingTds: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Passing Yards"
                type="number"
                value={parentFormData.passingYards}
                onChange={(e) => setParentFormData({ ...parentFormData, passingYards: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Rushing TDs"
                type="number"
                value={parentFormData.rushingTds}
                onChange={(e) => setParentFormData({ ...parentFormData, rushingTds: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Rushing Yards"
                type="number"
                value={parentFormData.rushingYards}
                onChange={(e) => setParentFormData({ ...parentFormData, rushingYards: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Receiving TDs"
                type="number"
                value={parentFormData.receivingTds}
                onChange={(e) => setParentFormData({ ...parentFormData, receivingTds: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Receiving Yards"
                type="number"
                value={parentFormData.receivingYards}
                onChange={(e) => setParentFormData({ ...parentFormData, receivingYards: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Flag Pulls / Tackles"
                type="number"
                value={parentFormData.flagPulls}
                onChange={(e) => setParentFormData({ ...parentFormData, flagPulls: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Interceptions Caught"
                type="number"
                value={parentFormData.interceptions}
                onChange={(e) => setParentFormData({ ...parentFormData, interceptions: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#00E5FF]">3. Combine Measurables</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="40-Yard Dash (s)"
                type="number"
                step="0.01"
                value={parentFormData.fortyYardDash}
                onChange={(e) => setParentFormData({ ...parentFormData, fortyYardDash: e.target.value })}
                placeholder="4.81"
              />
              <Input
                label="Vertical Jump (in)"
                type="number"
                step="0.1"
                value={parentFormData.verticalJump}
                onChange={(e) => setParentFormData({ ...parentFormData, verticalJump: e.target.value })}
                placeholder="28.5"
              />
              <Input
                label="5-10-5 Shuttle (s)"
                type="number"
                step="0.01"
                value={parentFormData.shuttle5105}
                onChange={(e) => setParentFormData({ ...parentFormData, shuttle5105: e.target.value })}
                placeholder="4.32"
              />
              <Input
                label="Broad Jump (in)"
                type="number"
                step="0.1"
                value={parentFormData.broadJump}
                onChange={(e) => setParentFormData({ ...parentFormData, broadJump: e.target.value })}
                placeholder="84"
              />
            </div>
          </div>

          <Input
            label="Verification Notes"
            value={parentFormData.notes}
            onChange={(e) => setParentFormData({ ...parentFormData, notes: e.target.value })}
            placeholder="Optional context or link to video highlights"
          />

          <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsParentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={parentSubmitting}>
              Submit for Verification
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Off-screen export target for the rating card (never user-visible). */}
      {shareCardData && (
        <div aria-hidden="true" style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          <ShareCard ref={shareCardRef} data={shareCardData} />
        </div>
      )}

    </div>
  );
};
