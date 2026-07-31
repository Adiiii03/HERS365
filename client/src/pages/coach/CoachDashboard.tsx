import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  MessageSquare,
  BarChart3,
  Heart,
  Eye,
  MapPin,
  Star,
  ChevronRight
} from 'lucide-react';
import type { CoachAnalytics as CoachAnalyticsType, PlayerClip } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { StatsVerificationStatus } from '../../components/StatsVerificationStatus';
import { Button, Card, EmptyState, StatCardSkeleton, CardSkeleton } from '../../components/ui';
import { colors, radii, type as typeTokens } from '../../lib/tokens';

const display = typeTokens.font.display;

export function CoachDashboard() {
  const [analytics, setAnalytics] = useState<CoachAnalyticsType | null>(null);
  const [clips, setClips] = useState<PlayerClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Set true if any coach endpoint returns 403 with code COACH_PENDING_VERIFICATION.
  // Replaces the "all zeros" cold render with an explicit status message.
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verifiedStatsOnly, setVerifiedStatsOnly] = useState(false);
  const { showNotification } = useNotifications();

  const visibleClips = verifiedStatsOnly ? clips.filter((clip) => clip.verified) : clips;

  useEffect(() => {
    fetchAnalytics();
    fetchClips();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/api/coach/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        const body = await response.json().catch(() => ({}));
        if (body?.code === 'COACH_PENDING_VERIFICATION') setPendingVerification(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch {
      showNotification('error', 'Load Failed', 'Could not load analytics data.');
    }
  };

  const fetchClips = async () => {
    setLoadError(false);
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/api/coach/player-clips', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        const body = await response.json().catch(() => ({}));
        if (body?.code === 'COACH_PENDING_VERIFICATION') setPendingVerification(true);
        setLoading(false);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setClips(Array.isArray(data?.clips) ? data.clips : []);
      }
    } catch {
      setLoadError(true);
      showNotification('error', 'Load Failed', 'Could not load player clips.');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Player Search',
      description: 'Find and discover new talent',
      icon: Search,
      path: '/coach/search',
      tint: colors.accent,
    },
    {
      title: 'Scouting Board',
      description: 'Manage your watchlist',
      icon: Heart,
      path: '/coach/board',
      tint: colors.pink,
    },
    {
      title: 'Messages',
      description: 'Contact athletes and parents',
      icon: MessageSquare,
      path: '/coach/messages',
      tint: colors.success,
    },
    {
      title: 'Analytics',
      description: 'View recruiting insights',
      icon: BarChart3,
      path: '/coach/analytics',
      tint: colors.accentHover,
    },
  ];

  const statTiles = [
    { label: 'Board Size', value: analytics?.boardCount ?? 0, icon: Heart, iconColor: colors.pink },
    { label: 'Messages Sent', value: analytics?.messagesSent ?? 0, icon: MessageSquare, iconColor: colors.success },
    { label: 'Profile Views', value: analytics?.profileViews ?? 0, icon: Eye, iconColor: colors.accentText },
    { label: 'Top State', value: analytics?.topStates?.[0] ?? 'N/A', icon: MapPin, iconColor: colors.neon },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.surface0, color: colors.textPrimary }}>
      {/* Header */}
      <div style={{ backgroundColor: colors.surface1, borderBottom: `1px solid ${colors.border}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: display, color: colors.textPrimary, letterSpacing: typeTokens.tracking.h1 }}
          >
            Coach Dashboard
          </h1>
          <p className="mt-2" style={{ color: colors.textSecondary }}>Welcome back! Here's your recruiting overview.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pendingVerification && (
          <div
            className="mb-6 p-5"
            style={{
              backgroundColor: colors.surface2,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: radii.md,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: `${colors.neon}1f`, color: colors.neon }}
              >
                ⏳
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ fontFamily: display, color: colors.textPrimary }}>
                  Your account is pending verification
                </h3>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: colors.textSecondary }}>
                  To keep athletes safe we manually review every coach account. Until an admin approves you, search, messaging,
                  and scouting board actions are locked. We'll email you when you're cleared. Most accounts are reviewed within
                  one business day.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {!analytics && !pendingVerification ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            statTiles.map(({ label, value, icon: Icon, iconColor }) => (
              <Card key={label} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>{label}</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ fontFamily: display, color: colors.textPrimary }}
                    >
                      {value}
                    </p>
                  </div>
                  <Icon className="w-8 h-8" style={{ color: iconColor }} />
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ fontFamily: display, color: colors.textPrimary, letterSpacing: typeTokens.tracking.h2 }}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.path}
                className="p-6 transition-colors group"
                style={{
                  backgroundColor: colors.surface1,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex w-11 h-11 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${action.tint}22`, color: action.tint }}
                  >
                    <action.icon className="w-6 h-6" />
                  </span>
                  <ChevronRight
                    className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: colors.textSecondary }}
                  />
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: colors.textPrimary }}>{action.title}</h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card className="p-6">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: display, color: colors.textPrimary }}
            >
              Recent Activity
            </h3>
            <div className="space-y-4">
              {analytics?.recentlyViewed?.slice(0, 5).map((playerId) => (
                <div
                  key={playerId}
                  className="flex items-center justify-between p-3"
                  style={{ backgroundColor: colors.surface2, borderRadius: radii.md }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.surface1 }}
                    >
                      <Users className="w-5 h-5" style={{ color: colors.textSecondary }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>Viewed Player #{playerId}</p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>Recently viewed</p>
                    </div>
                  </div>
                  <Link
                    to={`/coach/player/${playerId}`}
                    className="text-sm font-medium transition-colors"
                    style={{ color: colors.accentText }}
                  >
                    View
                  </Link>
                </div>
              )) || (
                <EmptyState
                  icon={<Eye className="w-10 h-10" />}
                  title="No recent activity"
                  body="Players you view will show up here so you can jump back into your recruiting flow."
                  cta={
                    <Link to="/coach/search">
                      <Button size="md">Find Players</Button>
                    </Link>
                  }
                />
              )}
            </div>
          </Card>

          {/* Trending Players */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: display, color: colors.textPrimary }}
              >
                Trending Players
              </h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0" style={{ color: colors.textSecondary }}>
                <input
                  type="checkbox"
                  checked={verifiedStatsOnly}
                  onChange={(e) => setVerifiedStatsOnly(e.target.checked)}
                  className="w-4 h-4 accent-accent-500 rounded"
                />
                Verified Stats Only
              </label>
            </div>
            <div className="space-y-4">
              {visibleClips.slice(0, 5).map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center gap-4 p-3 transition-colors"
                  style={{ backgroundColor: colors.surface2, borderRadius: radii.md }}
                >
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="w-16 h-16 object-cover"
                      style={{ borderRadius: radii.md }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 flex items-center justify-center text-xl font-bold"
                      style={{ backgroundColor: colors.surface1, borderRadius: radii.md, color: colors.textSecondary }}
                    >
                      {clip.name?.[0] ?? '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium" style={{ color: colors.textPrimary }}>{clip.name}</h4>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>{clip.position} • {clip.school}</p>
                    <div className="mt-1.5">
                      <StatsVerificationStatus verified={clip.verified} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3"
                            style={{ color: i < clip.stars ? colors.neon : colors.textTertiary }}
                            fill={i < clip.stars ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: colors.textSecondary }}>• {clip.breakoutScore} BR</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium" style={{ color: colors.textPrimary }}>{(clip.views ?? 0).toLocaleString()}</p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>views</p>
                  </div>
                </div>
              ))}
              {visibleClips.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: colors.textSecondary }}>
                  {verifiedStatsOnly
                    ? 'No verified-stat players in trending right now.'
                    : 'No trending players yet.'}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Player Highlights Feed */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: display, color: colors.textPrimary, letterSpacing: typeTokens.tracking.h2 }}
            >
              Player Highlights
            </h2>
            <Link
              to="/coach/search"
              className="text-sm font-medium"
              style={{ color: colors.accentText }}
            >
              View All Players →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mb-4" style={{ color: colors.textSecondary }}>Could not load player highlights.</p>
              <Button onClick={() => { setLoading(true); fetchClips(); }}>Retry</Button>
            </div>
          ) : visibleClips.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: colors.textSecondary }}>
              {verifiedStatsOnly
                ? 'No verified-stat highlights to show. Turn off Verified Stats Only to see all clips.'
                : 'No player highlights yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleClips.slice(0, 6).map((clip) => (
                <Card key={clip.id} hover className="overflow-hidden">
                  <div className="aspect-video relative" style={{ backgroundColor: colors.surface2 }}>
                    {clip.thumbnailUrl ? (
                      <img
                        src={clip.thumbnailUrl}
                        alt={clip.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                          style={{ backgroundColor: colors.surface1, color: colors.textSecondary }}
                        >
                          {clip.name?.[0] ?? '?'}
                        </div>
                      </div>
                    )}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                    >
                      <div className="text-center" style={{ color: colors.textPrimary }}>
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-medium">{clip.name}</p>
                        <p className="text-xs opacity-80">{clip.position} • {clip.school}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-2" style={{ color: colors.textPrimary }}>{clip.title}</h3>
                    <div className="mb-3">
                      <StatsVerificationStatus verified={clip.verified} />
                    </div>

                    <div className="flex items-center justify-between text-sm mb-3" style={{ color: colors.textSecondary }}>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {(clip.views ?? 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {(clip.likes ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs">{clip.breakoutScore} BR</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Link
                        to={`/coach/player/${clip.playerId}`}
                        className="text-sm font-medium"
                        style={{ color: colors.accentText }}
                      >
                        View Profile
                      </Link>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3"
                            style={{ color: i < clip.stars ? colors.neon : colors.textTertiary }}
                            fill={i < clip.stars ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
