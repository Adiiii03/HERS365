import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MapPin, CheckCircle2, MessageSquare, ArrowLeft, UserPlus, UserCheck, Trophy } from 'lucide-react';
import { tokens } from '../lib/tokens';
import { Button, Card, Stat, Badge } from '../components/ui';
import { variants, springs } from '../lib/motion';
import { useHaptics } from '../lib/haptics';
import { useNotifications } from '../context/NotificationContext';
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
  const isVerified = player.verified ?? player.verificationStatus === 'verified';
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
                {isVerified && <CheckCircle2 size={16} color={colors.neonOn} fill={colors.neon} />}
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

      {/* Stats from API */}
      {stats.length > 0 && (
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontFamily: type.font.display, fontWeight: type.weight.bold, fontSize: type.size.md, textTransform: 'uppercase', color: text.tertiary, marginBottom: 16, letterSpacing: type.tracking.h2 }}>
            Game Stats
          </h2>
          {stats.map((s, i) => (
            <div key={i} style={{ fontSize: type.size.base, color: text.secondary, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {s.season && <span style={{ color: colors.accent, marginRight: 8 }}>{s.season}</span>}
              {s.touchdowns !== undefined && <span style={{ marginRight: 12 }}>TDs: <b style={{ color: text.primary }}>{s.touchdowns}</b></span>}
              {s.yards !== undefined && <span style={{ marginRight: 12 }}>Yds: <b style={{ color: text.primary }}>{s.yards}</b></span>}
              {s.completionPct !== undefined && <span>Comp%: <b style={{ color: text.primary }}>{s.completionPct}%</b></span>}
            </div>
          ))}
        </Card>
      )}

      {/* Off-screen export target for the rating card (never user-visible). */}
      {shareCardData && (
        <div aria-hidden="true" style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          <ShareCard ref={shareCardRef} data={shareCardData} />
        </div>
      )}

    </div>
  );
};
