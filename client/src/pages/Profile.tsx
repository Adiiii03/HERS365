import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Edit3, CheckCircle2, Share2, MessageSquare, Loader2, AlertTriangle,
  UserX, Link2, Instagram, Eye, Play, Upload, Film, Image, Trophy, Zap,
  Activity, X, Award, Star, Shield, Target, Flame, Medal
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, errorMessage } from '../lib/api';
import { athleteAvatar } from '../lib/avatar';
import { useRatingReveal } from '../hooks/useRatingReveal';
import { ShareCard } from '../components/ShareCard';
import { toShareCard, type ShareCardData } from '../lib/shareCard';
import { colors, type as t, radii } from '../lib/tokens';
import { Button, Card, Input } from '../components/ui';

const DISP = t.font.display;

interface ApiProfile {
  id: number;
  name: string;
  position: string;
  state: string;
  city: string;
  school: string;
  gradYear: number;
  gpa: string | null;
  bio: string | null;
  achievements: string;
  verificationStatus: string;
  g5Rating: number;
  archetype: string;
  nilPoints: number;
  heightIn: number | null;
  weightLbs: number | null;
  profileImage: string | null;
}

interface EditForm {
  name: string;
  position: string;
  school: string;
  location: string;
  gradYear: string;
  bio: string;
  heightIn: string;
  weightLbs: string;
}

interface GameStat {
  passingAttempts: number | null;
  passingCompletions: number | null;
  passingYards: number | null;
  passingTds: number | null;
  interceptionsThrown: number | null;
  rushingAttempts: number | null;
  rushingYards: number | null;
  rushingTds: number | null;
  receptions: number | null;
  receivingYards: number | null;
  receivingTds: number | null;
  flagPulls: number | null;
  interceptionsCaught: number | null;
  passBreakups: number | null;
  defensiveTds: number | null;
}

interface CombineStat {
  fortyDash: string | null;
  shuttle: string | null;
  vertical: string | null;
  broadJump: string | null;
  threeCone: string | null;
}

interface Highlight {
  id: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  season: string | null;
  createdAt: string;
}

const tabs = ['Overview', 'Stats', 'Highlights', 'Activity'];

function fmtHeight(inches: number | null): string {
  if (!inches) return '--';
  const ft = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${ft}'${rem}"`;
}

type GameStatKey = keyof GameStat;

function sumGameStats(stats: GameStat[]): GameStat {
  const acc: GameStat = {
    passingAttempts: 0, passingCompletions: 0, passingYards: 0, passingTds: 0,
    interceptionsThrown: 0, rushingAttempts: 0, rushingYards: 0, rushingTds: 0,
    receptions: 0, receivingYards: 0, receivingTds: 0, flagPulls: 0,
    interceptionsCaught: 0, passBreakups: 0, defensiveTds: 0,
  };
  const keys = Object.keys(acc) as GameStatKey[];
  for (const s of stats) {
    for (const k of keys) {
      acc[k] = (acc[k] ?? 0) + (s[k] ?? 0);
    }
  }
  return acc;
}

export const Profile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('Overview');
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const isOwnProfile = !!profile && !!user && user.id === profile.id;
  const canEdit = isOwnProfile && user.role !== 'coach';
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewAsCoach, setViewAsCoach] = useState(false);

  // The signature moment: count-up + bloom + badge stamp fires on the
  // athlete's OWN profile only. Disabled in coach-view mode and on a
  // teammate's profile. Reduced-motion + storage failure both fail to
  // a static final value inside the hook. Lifted above any early returns so
  // the hook order is stable across loading / error / empty branches.
  const targetScore = profile?.g5Rating != null ? profile.g5Rating * 20 : null;
  const { value: liveScore, revealing } = useRatingReveal(targetScore, {
    enabled: isOwnProfile && !viewAsCoach,
  });

  // Share card render target + flag. Mounted off-screen only while exporting
  // so the snapshot can read live fonts and computed styles.
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [shareCardData, setShareCardData] = useState<ShareCardData | null>(null);
  const [exportingCard, setExportingCard] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', position: '', school: '', location: '', gradYear: '', bio: '', heightIn: '', weightLbs: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Upload a new profile photo: presign → PUT to S3 → PUT /api/profile.
  // Refreshes the profile state inline so the avatar swaps without a reload.
  const uploadPhoto = async (file: File) => {
    if (!profile) return;
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Invalid file', 'Please pick an image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Too large', 'Photo must be under 5MB.');
      return;
    }
    setPhotoUploading(true);
    try {
      const presign = await apiFetch<{ uploadUrl: string; publicUrl: string }>('/api/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const putRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('upload failed');
      const updated = await apiFetch<ApiProfile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ profileImage: presign.publicUrl }),
      });
      setProfile(updated);
      showNotification('success', 'Photo updated', 'Looking good.');
    } catch (err) {
      showNotification('error', 'Upload failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setPhotoUploading(false);
    }
  };
  const [editError, setEditError] = useState<string | null>(null);

  const [gameStats, setGameStats] = useState<GameStat[]>([]);
  const [combineStats, setCombineStats] = useState<CombineStat | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [uploadingHighlight, setUploadingHighlight] = useState(false);
  const highlightInputRef = useRef<HTMLInputElement>(null);

  interface Badge {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    category: string | null;
    earnedAt: string | null;
  }
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    if (shareOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareOpen]);

  const closeEdit = useCallback(() => setEditOpen(false), []);
  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeEdit(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editOpen, closeEdit]);
  useEffect(() => { if (editOpen) nameInputRef.current?.focus(); }, [editOpen]);

  const profileUrl = id ? `https://hers365.com/profile/${id}` : `https://hers365.com/profile`;

  const openEdit = () => {
    if (!profile) return;
    setEditForm({
      name: profile.name ?? '',
      position: profile.position ?? '',
      school: profile.school ?? '',
      location: profile.state ?? '',
      gradYear: profile.gradYear != null ? String(profile.gradYear) : '',
      bio: profile.bio ?? '',
      heightIn: profile.heightIn != null ? String(profile.heightIn) : '',
      weightLbs: profile.weightLbs != null ? String(profile.weightLbs) : '',
    });
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { setEditError('Name is required.'); return; }
    if (editForm.gradYear && (!/^\d{4}$/.test(editForm.gradYear) || Number(editForm.gradYear) < 2020 || Number(editForm.gradYear) > 2035)) {
      setEditError('Graduation year must be a valid 4-digit year (2020-2035).');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await apiFetch<ApiProfile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          position: editForm.position.trim() || undefined,
          school: editForm.school.trim() || undefined,
          state: editForm.location.trim() || undefined,
          gradYear: editForm.gradYear ? Number(editForm.gradYear) : undefined,
          bio: editForm.bio.trim() || undefined,
          heightIn: editForm.heightIn || undefined,
          weightLbs: editForm.weightLbs || undefined,
        }),
      });
      setProfile(updated);
      if (user && updated.name) updateUser({ name: updated.name });
      setEditOpen(false);
      showNotification('success', 'Profile updated', 'Your changes have been saved.');
    } catch (err) {
      setEditError(errorMessage(err, 'Failed to save. Please try again.'));
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setIsError(false);
      setIsEmpty(false);
      try {
        const endpoint = id ? `/api/players/${id}` : '/api/profile';
        const data = await apiFetch<ApiProfile | null>(endpoint);
        if (!data || !data.name) { setIsEmpty(true); } else { setProfile(data); }
      } catch { setIsError(true); }
      finally { setIsLoading(false); }
    };
    loadProfile();
  }, [id]);

  useEffect(() => {
    if (!profile) return;
    setStatsLoading(true);
    if (isOwnProfile) {
      apiFetch<{ game: GameStat[]; combine: CombineStat | null }>('/api/profile/stats')
        .then(d => {
          setGameStats(Array.isArray(d?.game) ? d.game : []);
          setCombineStats(d?.combine ?? null);
        })
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    } else {
      apiFetch<GameStat[]>(`/api/players/${profile.id}/stats`)
        .then(d => { setGameStats(Array.isArray(d) ? d : []); })
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    }
  }, [profile, isOwnProfile]);

  useEffect(() => {
    if (!profile) return;
    setHighlightsLoading(true);
    apiFetch<Highlight[]>(`/api/players/${profile.id}/highlights`)
      .then(d => setHighlights(Array.isArray(d) ? d : []))
      .catch(() => setHighlights([]))
      .finally(() => setHighlightsLoading(false));
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    apiFetch<{ success: boolean; data: Badge[] }>(`/api/badges/${profile.id}`)
      .then(d => setBadges(Array.isArray(d?.data) ? d.data : []))
      .catch(() => setBadges([]));
  }, [profile]);

  const handleHighlightUpload = async (file: File) => {
    if (!profile) return;
    setUploadingHighlight(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const presignEndpoint = isVideo ? '/api/upload/video/presign' : '/api/upload/presign';
      const { uploadUrl, publicUrl } = await apiFetch<{ uploadUrl: string; publicUrl: string }>(presignEndpoint, {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, fileName: file.name }),
      });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const hl = await apiFetch<Highlight>(`/api/players/${profile.id}/highlights`, {
        method: 'POST',
        body: JSON.stringify({
          videoUrl: isVideo ? publicUrl : null,
          thumbnailUrl: !isVideo ? publicUrl : null,
          category: 'general',
          season: String(new Date().getFullYear()),
        }),
      });
      setHighlights(prev => [hl, ...prev]);
      showNotification('success', 'Uploaded!', 'Your highlight has been added.');
    } catch (err) {
      showNotification('error', 'Upload failed', errorMessage(err, 'Please try again.'));
    } finally {
      setUploadingHighlight(false);
    }
  };

  const profileCompleteness = useMemo(() => {
    if (!profile) return null;
    const items: { label: string; done: boolean; points: number }[] = [
      { label: 'Add your position', done: !!profile.position, points: 10 },
      { label: 'Add your school', done: !!profile.school, points: 10 },
      { label: 'Add your grad year', done: !!profile.gradYear, points: 5 },
      { label: 'Add your height and weight', done: !!(profile.heightIn && profile.weightLbs), points: 15 },
      { label: 'Add your GPA', done: !!(profile.gpa?.trim()), points: 10 },
      { label: 'Write a bio (50+ chars)', done: (profile.bio?.trim().length ?? 0) >= 50, points: 10 },
      { label: 'Log at least one game stat', done: gameStats.length > 0, points: 15 },
      { label: 'Record a combine time', done: !!(combineStats && (combineStats.fortyDash || combineStats.shuttle || combineStats.vertical)), points: 15 },
      { label: 'Upload a highlight reel', done: highlights.length > 0, points: 10 },
    ];
    const earned = items.filter(i => i.done).reduce((s, i) => s + i.points, 0);
    const total = items.reduce((s, i) => s + i.points, 0);
    const pct = Math.round((earned / total) * 100);
    const nudges = items.filter(i => !i.done).slice(0, 3);
    return { pct, nudges };
  }, [profile, gameStats, combineStats, highlights]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: colors.surface0, color: colors.textSecondary, gap: 16 }}>
        <Loader2 size={40} color={colors.accent} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: t.size.md, letterSpacing: '0.05em' }}>Loading profile...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError && !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: colors.surface0, color: colors.textSecondary, gap: 16, padding: 24 }}>
        <AlertTriangle size={48} color={colors.textTertiary} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: t.size.lg, fontWeight: t.weight.bold, color: colors.textPrimary, marginBottom: 6 }}>Something went wrong</p>
          <p style={{ fontSize: t.size.base, color: colors.textTertiary, marginBottom: 16 }}>Unable to load this profile. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: colors.surface0, color: colors.textSecondary, gap: 16, padding: 24 }}>
        <UserX size={48} color={colors.textTertiary} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: t.size.lg, fontWeight: t.weight.bold, color: colors.textPrimary, marginBottom: 6 }}>No profile data found</p>
          <p style={{ fontSize: t.size.base, color: colors.textTertiary }}>This athlete hasn't set up their profile yet.</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const location = [profile.city, profile.state].filter(Boolean).join(', ');
  const verified = profile.verificationStatus === 'verified';
  const score = targetScore == null ? '--' : String(liveScore);
  const achievementList = profile.achievements
    ? profile.achievements.split(/[\n,]+/).map(a => a.trim()).filter(Boolean)
    : [];
  const totals = gameStats.length > 0 ? sumGameStats(gameStats) : null;

  const effectiveCanEdit = canEdit && !viewAsCoach;

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
      {viewAsCoach && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(139,59,255,0.1)', border: `1px solid ${colors.borderStrong}`, borderRadius: radii.md, padding: '10px 14px' }}>
          <Eye size={14} color={colors.accentText} />
          <span style={{ fontSize: t.size.sm, color: colors.accentText, fontWeight: t.weight.semibold }}>Viewing as Coach — edit controls hidden</span>
          <button onClick={() => setViewAsCoach(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: colors.accentText, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
        </div>
      )}

      {/* Hero card */}
      <Card style={{ padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(139,59,255,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', borderRadius: radii.md }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={profile.profileImage || athleteAvatar(profile.name)}
              alt={profile.name}
              style={{
                width: 80, height: 80, borderRadius: '50%', background: colors.surface2,
                border: `2px solid ${colors.borderStrong}`, objectFit: 'cover',
                opacity: photoUploading ? 0.5 : 1, transition: 'opacity .2s',
              }}
            />
            {isOwnProfile && !viewAsCoach && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadPhoto(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  aria-label="Change profile photo"
                  title="Change photo"
                  style={{
                    position: 'absolute', bottom: -2, left: -2,
                    width: 26, height: 26, borderRadius: '50%',
                    background: colors.accent, border: `2px solid ${colors.surface1}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: photoUploading ? 'wait' : 'pointer', color: colors.accentOn,
                    boxShadow: '0 2px 8px rgba(0,0,0,.5)',
                  }}
                >
                  {photoUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                </button>
              </>
            )}
            {verified && (
              <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
                <CheckCircle2
                  size={18}
                  color={colors.accent}
                  fill={colors.accent}
                  className={revealing ? 'hers-badge' : undefined}
                  style={{ background: colors.surface1, borderRadius: '50%' }}
                />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <h1 style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.xl, textTransform: 'uppercase', color: colors.textPrimary, lineHeight: 1, marginBottom: 4 }}>{profile.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(139,59,255,0.1)', color: colors.accent, fontSize: t.size.xs, fontWeight: t.weight.bold, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>{profile.position}</span>
                  <span style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{profile.school}</span>
                  <span style={{ fontSize: t.size.sm, color: colors.textTertiary }}>·</span>
                  <span style={{ fontSize: t.size.sm, color: colors.textSecondary }}>Class of {profile.gradYear}</span>
                </div>
                {location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <MapPin size={12} color={colors.textTertiary} />
                    <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{location}</span>
                  </div>
                )}
                {profile.bio && (
                  <p style={{ fontSize: t.size.sm, color: colors.textSecondary, marginTop: 8, maxWidth: 420, lineHeight: 1.5 }}>{profile.bio}</p>
                )}
              </div>

              <div
                style={{ textAlign: 'right', flexShrink: 0, cursor: 'help', position: 'relative' }}
                title={score === '--'
                  ? 'Your HERS Score appears once you log enough performance data.'
                  : 'HERS Score (0–100) derived from your logged stats, combine numbers, and on-platform recruiting activity. Updated whenever you log new data.'}
                aria-label={score === '--' ? 'HERS Score: not yet rated' : `HERS Score: ${targetScore} out of 100`}
                aria-live={revealing ? 'polite' : undefined}
              >
                {revealing && <div className="hers-glow" aria-hidden="true" />}
                <div
                  className="hers-rating-number"
                  style={{
                    fontFamily: DISP, fontWeight: 800, fontSize: '3.5rem',
                    color: colors.accent, lineHeight: 1, textShadow: '0 0 30px rgba(139,59,255,0.5)',
                    position: 'relative',
                  }}
                >
                  {score}
                </div>
                <div style={{ fontSize: '0.6rem', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2, position: 'relative' }}>HERS Score</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {!isOwnProfile && (
                <Button size="sm" onClick={() => navigate('/messages')}><MessageSquare size={14} /> Message</Button>
              )}
              {effectiveCanEdit && (
                <Button size="sm" onClick={openEdit}><Edit3 size={14} /> Edit Profile</Button>
              )}
              {isOwnProfile && !viewAsCoach && (
                <Button size="sm" variant="ghost" onClick={() => setViewAsCoach(true)}><Eye size={14} /> View As Coach</Button>
              )}
              <div ref={shareRef} style={{ position: 'relative' }}>
                <Button size="sm" variant="ghost" onClick={() => setShareOpen(v => !v)}><Share2 size={14} /> Share</Button>
                <AnimatePresence>
                  {shareOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50, background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: '6px', minWidth: 230, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
                    >
                      <ShareItem icon={<Link2 size={15} color={colors.accent} />} label="Copy Link" onClick={() => { navigator.clipboard.writeText(profileUrl); showNotification('success', 'Link copied!', profileUrl); setShareOpen(false); }} />
                      <ShareItem icon={<svg width="15" height="15" viewBox="0 0 24 24" fill={colors.textPrimary}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.857L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>} label="Share on X" onClick={() => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my HERS365 profile')}&url=${encodeURIComponent(profileUrl)}`, '_blank', 'noopener,noreferrer'); setShareOpen(false); }} />
                      <ShareItem icon={<Instagram size={15} color={colors.pink} />} label="Share on Instagram" onClick={() => { showNotification('info', 'Instagram', 'Copy the link and paste it in your Instagram bio.'); setShareOpen(false); }} />
                      {isOwnProfile && profile && (
                        <ShareItem
                          icon={<Trophy size={15} color={colors.accent} />}
                          label={exportingCard ? 'Building card…' : 'Share my rating card'}
                          onClick={() => {
                            if (exportingCard) return;
                            const card = toShareCard({
                              name: profile.name,
                              position: profile.position,
                              school: profile.school,
                              g5Rating: profile.g5Rating,
                              verificationStatus: profile.verificationStatus,
                              // rank + rankDelta are not on the profile API yet;
                              // omit them so the card stays accurate.
                            });
                            if (!card) {
                              showNotification('info', 'No card yet', 'Your HERS Rating needs to be set before we can build a card.');
                              return;
                            }
                            setShareCardData(card);
                            setExportingCard(true);
                            setShareOpen(false);
                            // Wait a tick so React mounts the off-screen card,
                            // then snapshot + share. Lazy-load html-to-image so
                            // it stays out of the main bundle.
                            requestAnimationFrame(async () => {
                              const fallbackToCopy = (msg: string) => {
                                try { navigator.clipboard.writeText(profileUrl); } catch { /* noop */ }
                                showNotification('info', 'Card unavailable', `${msg} — link copied instead.`);
                              };
                              try {
                                const node = shareCardRef.current;
                                if (!node) {
                                  fallbackToCopy("Couldn't make the image");
                                  return;
                                }
                                if (document.fonts && typeof document.fonts.ready?.then === 'function') {
                                  await document.fonts.ready;
                                }
                                const { toPng } = await import('html-to-image');
                                const dataUrl = await toPng(node, {
                                  pixelRatio: 2,
                                  cacheBust: true,
                                  backgroundColor: colors.surface0,
                                });
                                const blob = await (await fetch(dataUrl)).blob();
                                const file = new File([blob], 'my-hers-rating.png', { type: 'image/png' });
                                const navAny = navigator as Navigator & {
                                  canShare?: (data: { files?: File[] }) => boolean;
                                  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
                                };
                                if (
                                  navAny.share &&
                                  navAny.canShare &&
                                  navAny.canShare({ files: [file] })
                                ) {
                                  try {
                                    await navAny.share({
                                      files: [file],
                                      title: 'My HERS Rating',
                                      text: 'My HERS365 rating card',
                                    });
                                  } catch {
                                    // User cancelled the system share sheet —
                                    // not an error, but don't fall through to
                                    // the download either.
                                  }
                                } else {
                                  const a = document.createElement('a');
                                  a.href = dataUrl;
                                  a.download = 'my-hers-rating.png';
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                              } catch {
                                fallbackToCopy("Couldn't make the image");
                              } finally {
                                setExportingCard(false);
                                setShareCardData(null);
                              }
                            });
                          }}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${'rgba(255,255,255,0.06)'}` }}>
          {[
            { label: '40YD', value: combineStats?.fortyDash ?? '--' },
            { label: 'GPA', value: profile.gpa ?? '--' },
            { label: 'HGT', value: fmtHeight(profile.heightIn) },
            { label: 'WGT', value: profile.weightLbs ? `${profile.weightLbs} lbs` : '--' },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${'rgba(255,255,255,0.06)'}` : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.lg, color: colors.textPrimary }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Profile completion bar — only on the owner's view, only while incomplete. */}
      {isOwnProfile && !viewAsCoach && (() => {
        const steps = [
          { key: 'bio', label: 'Write a bio', done: Boolean(profile.bio && profile.bio.trim().length >= 20), action: openEdit },
          { key: 'hw', label: 'Add height & weight', done: Boolean(profile.heightIn && profile.weightLbs), action: openEdit },
          { key: 'gpa', label: 'Set your GPA', done: Boolean(profile.gpa && profile.gpa.trim()), action: openEdit },
          { key: 'highlight', label: 'Upload a highlight', done: highlights.length > 0, action: () => setActiveTab('Highlights') },
          { key: 'achievements', label: 'List achievements', done: Boolean(profile.achievements && profile.achievements.trim()), action: openEdit },
        ];
        const doneCount = steps.filter(s => s.done).length;
        const pct = Math.round((doneCount / steps.length) * 100);
        if (pct === 100) return null;
        return (
          <Card style={{ padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.sm, letterSpacing: '0.16em', textTransform: 'uppercase', color: colors.accent }}>
                  Profile {pct}% Complete
                </div>
                <div style={{ fontSize: t.size.sm, color: colors.textSecondary, marginTop: 4 }}>
                  Complete profiles get 4x more coach views.
                </div>
              </div>
              <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.md, color: colors.textPrimary }}>
                {doneCount}/{steps.length}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: radii.full, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${colors.accent},${colors.accentText})`, transition: 'width .4s' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {steps.filter(s => !s.done).slice(0, 3).map(s => (
                <button
                  key={s.key}
                  onClick={s.action}
                  style={{
                    background: 'rgba(139,59,255,0.08)', border: `1px solid ${colors.borderStrong}`,
                    color: colors.accentText, borderRadius: radii.full, padding: '7px 14px', fontSize: t.size.xs,
                    fontWeight: t.weight.bold, cursor: 'pointer', transition: 'all .18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,59,255,0.16)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,59,255,0.08)'; }}
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? colors.accent : 'transparent', border: '1px solid', borderColor: activeTab === tab ? colors.accent : colors.border, borderRadius: radii.sm, padding: '7px 16px', color: activeTab === tab ? colors.accentOn : colors.textSecondary, fontSize: t.size.sm, fontWeight: t.weight.bold, cursor: 'pointer', transition: 'all 0.15s' }}>{tab}</button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile completeness — own profile only, no coach view */}
          {isOwnProfile && !viewAsCoach && profileCompleteness && profileCompleteness.pct < 100 && (
            <div className="k-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Profile Strength</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#ff5a2d' }}>{profileCompleteness.pct}%</div>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${profileCompleteness.pct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #ff5a2d, #ff8c66)', transition: 'width 0.6s ease' }} />
              </div>
              {profileCompleteness.nudges.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {profileCompleteness.nudges.map((n) => (
                    <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5a2d', flexShrink: 0 }} />
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{n.label} <span style={{ color: '#ff5a2d', fontWeight: 600 }}>+{n.points}%</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Season totals */}
            <Card style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }}>Season Totals</div>
              {statsLoading ? (
                <div style={{ color: colors.textTertiary, fontSize: t.size.base }}>Loading...</div>
              ) : totals ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Pass Yards', value: totals.passingYards },
                    { label: 'Pass TDs', value: totals.passingTds },
                    { label: 'Rush Yards', value: totals.rushingYards },
                    { label: 'Rec Yards', value: totals.receivingYards },
                    { label: 'Flag Pulls', value: totals.flagPulls },
                    { label: 'INT', value: totals.interceptionsCaught },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${'rgba(255,255,255,0.04)'}` }}>
                      <span style={{ fontSize: t.size.sm, color: colors.textSecondary }}>{label}</span>
                      <span style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.md, color: colors.textPrimary }}>{value ?? '--'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: t.size.base, color: colors.textTertiary }}>No game stats recorded yet.</p>
              )}
            </Card>

            {/* Achievements */}
            <Card style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }}>Achievements</div>
              {achievementList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {achievementList.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${'rgba(255,255,255,0.04)'}` }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: t.size.base, color: colors.textPrimary }}>{a}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: t.size.base, color: colors.textTertiary }}>No achievements listed yet.</p>
              )}
            </Card>
          </div>

            {/* Badges */}
            <Card style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }}>Badges</div>
              {badges.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {badges.map(b => (
                    <div key={b.id} title={b.description ?? b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(139,59,255,0.07)', border: `1px solid ${colors.borderStrong}`, borderRadius: radii.sm, padding: '8px 12px' }}>
                      <BadgeIcon icon={b.icon} />
                      <div>
                        <div style={{ fontSize: t.size.sm, fontWeight: t.weight.bold, color: colors.textPrimary }}>{b.name}</div>
                        {b.category && <div style={{ fontSize: '0.62rem', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b.category}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: t.size.base, color: colors.textTertiary }}>Complete drills to earn your first badge.</p>
              )}
            </Card>
          </div>
        )}

        {/* STATS */}
        {activeTab === 'Stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Combine */}
            <Card style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }}>Combine / Measurables</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
                {[
                  { label: '40 Yard', value: combineStats?.fortyDash ?? '--' },
                  { label: 'Shuttle', value: combineStats?.shuttle ?? '--' },
                  { label: 'Vertical', value: combineStats?.vertical ?? '--' },
                  { label: 'Broad Jump', value: combineStats?.broadJump ?? '--' },
                  { label: '3-Cone', value: combineStats?.threeCone ?? '--' },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${'rgba(255,255,255,0.06)'}` : 'none', padding: '0 8px' }}>
                    <div style={{ fontSize: '0.6rem', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.xl, color: colors.textPrimary }}>{value}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Game stats */}
            {statsLoading ? (
              <Card style={{ padding: '32px', textAlign: 'center', color: colors.textTertiary }}>Loading stats...</Card>
            ) : gameStats.length > 0 ? (
              <>
                {totals && (
                  <Card style={{ padding: '18px 16px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }}>Season Totals ({gameStats.length} games)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {[
                        { section: 'Passing', items: [
                          { label: 'Attempts', value: totals.passingAttempts },
                          { label: 'Completions', value: totals.passingCompletions },
                          { label: 'Yards', value: totals.passingYards },
                          { label: 'TDs', value: totals.passingTds },
                          { label: 'INTs', value: totals.interceptionsThrown },
                        ]},
                        { section: 'Rushing', items: [
                          { label: 'Attempts', value: totals.rushingAttempts },
                          { label: 'Yards', value: totals.rushingYards },
                          { label: 'TDs', value: totals.rushingTds },
                        ]},
                        { section: 'Receiving', items: [
                          { label: 'Receptions', value: totals.receptions },
                          { label: 'Yards', value: totals.receivingYards },
                          { label: 'TDs', value: totals.receivingTds },
                        ]},
                        { section: 'Defense', items: [
                          { label: 'Flag Pulls', value: totals.flagPulls },
                          { label: 'INTs', value: totals.interceptionsCaught },
                          { label: 'Pass BUs', value: totals.passBreakups },
                          { label: 'Def TDs', value: totals.defensiveTds },
                        ]},
                      ].map(({ section, items }) => (
                        <div key={section}>
                          <div style={{ fontSize: '0.62rem', fontWeight: t.weight.bold, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{section}</div>
                          {items.map(({ label, value }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${'rgba(255,255,255,0.04)'}` }}>
                              <span style={{ fontSize: t.size.xs, color: colors.textSecondary }}>{label}</span>
                              <span style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.base, color: value ? colors.textPrimary : colors.textTertiary }}>{value ?? '--'}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Per-game log */}
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${'rgba(255,255,255,0.06)'}`, fontSize: '0.65rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary }}>Game Log</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: t.size.sm }}>
                      <thead>
                        <tr>
                          {['#', 'Pass YDS', 'Pass TD', 'Rush YDS', 'Rec YDS', 'Flag Pulls'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.6rem', fontWeight: t.weight.bold, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gameStats.map((g, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${'rgba(255,255,255,0.04)'}` }}>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.textTertiary, fontWeight: t.weight.bold }}>G{i + 1}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.textPrimary }}>{g.passingYards ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.textPrimary }}>{g.passingTds ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.textPrimary }}>{g.rushingYards ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.textPrimary }}>{g.receivingYards ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: colors.textPrimary }}>{g.flagPulls ?? '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            ) : (
              <Card style={{ padding: '48px', textAlign: 'center' }}>
                <Zap size={32} color={colors.textTertiary} style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 }}>No game stats yet</div>
                <div style={{ fontSize: t.size.base, color: colors.textTertiary }}>Stats will appear here once games are logged.</div>
              </Card>
            )}
          </div>
        )}

        {/* HIGHLIGHTS */}
        {activeTab === 'Highlights' && (
          <div>
            {effectiveCanEdit && (
              <div style={{ marginBottom: 16 }}>
                <input
                  type="file"
                  accept="video/*,image/*"
                  ref={highlightInputRef}
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleHighlightUpload(f); e.target.value = ''; }}
                />
                <Button
                  onClick={() => highlightInputRef.current?.click()}
                  disabled={uploadingHighlight}
                  style={{ opacity: uploadingHighlight ? 0.6 : 1 }}
                >
                  {uploadingHighlight ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</> : <><Upload size={14} /> Upload Highlight</>}
                </Button>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {highlightsLoading ? (
              <Card style={{ padding: '32px', textAlign: 'center', color: colors.textTertiary }}>Loading highlights...</Card>
            ) : highlights.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {highlights.map(h => (
                  <Card key={h.id} style={{ overflow: 'hidden', cursor: h.videoUrl ? 'pointer' : 'default', position: 'relative' }}
                    role={h.videoUrl ? 'button' : undefined}
                    tabIndex={h.videoUrl ? 0 : undefined}
                    aria-label={h.videoUrl ? 'Play highlight' : undefined}
                    onClick={() => h.videoUrl && window.open(h.videoUrl, '_blank', 'noopener,noreferrer')}
                    onKeyDown={(e) => { if (h.videoUrl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); window.open(h.videoUrl, '_blank', 'noopener,noreferrer'); } }}>
                    <div style={{ aspectRatio: '16/9', background: colors.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {h.thumbnailUrl ? (
                        <img src={h.thumbnailUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} alt="Highlight" />
                      ) : null}
                      {h.videoUrl ? (
                        <div style={{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={18} color={colors.textPrimary} fill={colors.textPrimary} />
                        </div>
                      ) : (
                        <Image size={24} color={colors.textTertiary} />
                      )}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: t.size.xs, color: colors.textSecondary }}>
                        {h.videoUrl ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Film size={11} /> Video</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Image size={11} /> Photo</span>}
                      </div>
                      {h.season && <div style={{ fontSize: '0.65rem', color: colors.textTertiary, marginTop: 2 }}>{h.season}</div>}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ padding: '48px', textAlign: 'center' }}>
                <Film size={32} color={colors.textTertiary} style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 }}>No highlights yet</div>
                {effectiveCanEdit ? (
                  <div style={{ fontSize: t.size.base, color: colors.textTertiary }}>Upload a video or photo to get started.</div>
                ) : (
                  <div style={{ fontSize: t.size.base, color: colors.textTertiary }}>This athlete hasn't uploaded highlights yet.</div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === 'Activity' && (
          <Card style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 14 }}>
              <Activity size={12} style={{ display: 'inline', marginRight: 6 }} />Recent Activity
            </div>
            {profile.nilPoints || profile.archetype ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profile.archetype && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${'rgba(255,255,255,0.04)'}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(139,59,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trophy size={14} color={colors.accent} /></div>
                    <div>
                      <div style={{ fontSize: t.size.base, color: colors.textPrimary, fontWeight: t.weight.semibold }}>Archetype: {profile.archetype}</div>
                      <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>Playing style identified</div>
                    </div>
                  </div>
                )}
                {(profile.nilPoints ?? 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${'rgba(255,255,255,0.04)'}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={14} color={colors.success} /></div>
                    <div>
                      <div style={{ fontSize: t.size.base, color: colors.textPrimary, fontWeight: t.weight.semibold }}>{profile.nilPoints} NIL Points earned</div>
                      <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>NIL activity</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: t.size.base, color: colors.textTertiary }}>No recent activity yet.</p>
            )}
          </Card>
        )}
      </motion.div>

      {/* Edit modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.15 }}
              role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"
              style={{ background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.lg, padding: '28px 24px', width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <h2 id="edit-profile-title" style={{ fontFamily: DISP, fontWeight: 800, fontSize: t.size.xl, textTransform: 'uppercase', color: colors.textPrimary, margin: 0 }}>Edit Profile</h2>
                <button onClick={() => setEditOpen(false)} style={{ background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: 4, lineHeight: 1, fontSize: t.size.lg }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Name', key: 'name', placeholder: 'Full name' },
                  { label: 'Position', key: 'position', placeholder: 'e.g. QB, WR, CB' },
                  { label: 'School', key: 'school', placeholder: 'High school name' },
                  { label: 'Location (State)', key: 'location', placeholder: 'e.g. CA, TX' },
                  { label: 'Graduation Year', key: 'gradYear', placeholder: 'e.g. 2026', inputMode: 'numeric' as const },
                  { label: 'Height (inches)', key: 'heightIn', placeholder: 'e.g. 68 (for 5\'8")', inputMode: 'numeric' as const },
                  { label: 'Weight (lbs)', key: 'weightLbs', placeholder: 'e.g. 145', inputMode: 'numeric' as const },
                ].map(({ label, key, placeholder, inputMode }) => (
                  <Input
                    key={key}
                    ref={key === 'name' ? nameInputRef : undefined}
                    label={label}
                    value={editForm[key as keyof EditForm]}
                    onChange={e => { setEditForm(f => ({ ...f, [key]: e.target.value })); setEditError(null); }}
                    placeholder={placeholder}
                    inputMode={inputMode}
                  />
                ))}

                <div>
                  <label style={{ display: 'block', fontSize: t.size.xs, fontWeight: t.weight.semibold, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 }}>Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={e => { setEditForm(f => ({ ...f, bio: e.target.value })); setEditError(null); }}
                    placeholder="A short bio about yourself"
                    rows={3}
                    className="k-input"
                    style={{ width: '100%', padding: '10px 12px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {editError && (
                <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(139,59,255,0.1)', border: `1px solid ${colors.borderStrong}`, borderRadius: radii.sm, color: colors.accentText, fontSize: t.size.base }}>{editError}</div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
                <Button onClick={saveEdit} disabled={editSaving} loading={editSaving}>Save Changes</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Off-screen render target for the share card snapshot. Position fixed
          at -9999px keeps it out of the viewport entirely (not 'display:none',
          which would zero out the layout html-to-image needs). aria-hidden
          keeps assistive tech from announcing it. */}
      {shareCardData && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}
        >
          <ShareCard ref={shareCardRef} data={shareCardData} />
        </div>
      )}
    </div>
  );
};

function BadgeIcon({ icon }: { icon: string | null }) {
  const s = { size: 16, color: colors.accent };
  switch ((icon ?? '').toLowerCase()) {
    case 'star': return <Star {...s} />;
    case 'shield': return <Shield {...s} />;
    case 'target': return <Target {...s} />;
    case 'flame': return <Flame {...s} />;
    case 'medal': return <Medal {...s} />;
    case 'trophy': return <Trophy {...s} />;
    case 'zap': return <Zap {...s} />;
    default: return <Award {...s} />;
  }
}

function ShareItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none', borderRadius: radii.sm, padding: '9px 12px', color: colors.textPrimary, fontSize: t.size.base, fontWeight: t.weight.semibold, cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}{label}
    </button>
  );
}
