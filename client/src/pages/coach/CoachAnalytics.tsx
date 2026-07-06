import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Eye,
  MessageSquare,
  MapPin,
  Target,
  Award,
  Heart,
  BarChart3,
  CalendarClock,
} from 'lucide-react';
import { Button, Card, EmptyState } from '../../components/ui';
import { StatCardSkeleton, CardSkeleton } from '../../components/ui';
import { colors, type as t } from '../../lib/tokens';

type CoachAnalyticsResponse = {
  boardCount: number;
  messagesSent: number;
  playersContacted: number;
  topStates: string[];
  totalPlayersViewed: number;
  searchQueriesThisWeek: number;
  profileViewsThisWeek: number;
  avgSessionTime: number | null;
  boardConversionRate: number;
  recruitingPipeline: {
    prospects: number;
    contacted: number;
    offered: number;
    committed: number;
  };
  weeklyActivity: { day: string; searches: number; views: number; saves: number }[];
  positionBreakdown: { position: string; count: number; percentage: number }[];
};

async function fetchCoachAnalytics(): Promise<CoachAnalyticsResponse> {
  const token = localStorage.getItem('coachToken');
  const res = await fetch('/api/coach/analytics', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to load analytics (${res.status})`);
  }
  return res.json();
}

const displayHeading = {
  fontFamily: t.font.display,
  fontWeight: t.weight.bold,
  textTransform: 'uppercase' as const,
  letterSpacing: t.tracking.h2,
};

const metricNumeral = {
  fontFamily: t.font.display,
  fontWeight: t.weight.bold,
  fontSize: t.size['3xl'],
  lineHeight: 1,
  color: colors.textPrimary,
};

const rankTones = [colors.accent, colors.pink, colors.neon];

export function CoachAnalytics() {
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useQuery<CoachAnalyticsResponse>({
    queryKey: ['coach', 'analytics'],
    queryFn: fetchCoachAnalytics,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: colors.surface0, color: colors.textPrimary }}>
        <div style={{ background: colors.surface1, borderBottom: `1px solid ${colors.border}` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="h-8 w-64 rounded animate-pulse" style={{ background: colors.surface2 }} />
            <div className="h-4 w-80 rounded mt-3 animate-pulse" style={{ background: colors.surface2 }} />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: colors.surface0, color: colors.textPrimary }}
      >
        <p style={{ color: colors.textSecondary }}>Could not load analytics data.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const hasAnyActivity =
    analytics.boardCount > 0 ||
    analytics.messagesSent > 0 ||
    analytics.totalPlayersViewed > 0 ||
    analytics.searchQueriesThisWeek > 0;

  const topRecruitingStates = analytics.topStates.map(state => ({
    state,
    players: 0,
    percentage: 0,
  }));

  return (
    <div className="min-h-screen" style={{ background: colors.surface0, color: colors.textPrimary }}>
      {/* Header */}
      <div style={{ background: colors.surface1, borderBottom: `1px solid ${colors.border}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl" style={{ ...displayHeading, color: colors.textPrimary }}>
                Analytics Dashboard
              </h1>
              <p className="mt-2" style={{ color: colors.textSecondary }}>
                Track your recruiting performance and insights
              </p>
            </div>
            <Link to="/coach/search" className="k-btn k-btn-primary">
              Continue Recruiting
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasAnyActivity && (
          <Card className="p-6 mb-8 text-center">
            <p style={{ color: colors.textPrimary, fontWeight: t.weight.medium }}>No recruiting activity yet</p>
            <p className="text-sm mt-1" style={{ color: colors.textTertiary }}>
              Start searching for players and saving prospects to your board to see analytics here.
            </p>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Board Size</p>
                <p style={metricNumeral}>{analytics.boardCount}</p>
                <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>prospects on your board</p>
              </div>
              <Heart className="w-8 h-8" style={{ color: colors.pink }} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Players Viewed</p>
                <p style={metricNumeral}>{analytics.totalPlayersViewed}</p>
                <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>profile views</p>
              </div>
              <Eye className="w-8 h-8" style={{ color: colors.accent }} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Messages Sent</p>
                <p style={metricNumeral}>{analytics.messagesSent}</p>
                <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>messages sent total</p>
              </div>
              <MessageSquare className="w-8 h-8" style={{ color: colors.neon }} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>Conversion Rate</p>
                <p style={metricNumeral}>{analytics.boardConversionRate}%</p>
                <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>board to contact rate</p>
              </div>
              <Target className="w-8 h-8" style={{ color: colors.accent }} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recruiting Pipeline */}
          <Card className="p-6">
            <h3 className="text-lg mb-6" style={{ ...displayHeading, color: colors.textPrimary }}>Recruiting Pipeline</h3>
            <div className="space-y-4">
              <div
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: colors.surface2 }}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5" style={{ color: colors.textSecondary }} />
                  <span style={{ color: colors.textPrimary }}>Prospects</span>
                </div>
                <span className="text-xl" style={{ ...displayHeading, color: colors.accent }}>{analytics.recruitingPipeline.prospects}</span>
              </div>

              <div
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: colors.surface2 }}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" style={{ color: colors.accent }} />
                  <span style={{ color: colors.textPrimary }}>Contacted</span>
                </div>
                <span className="text-xl" style={{ ...displayHeading, color: colors.accent }}>{analytics.recruitingPipeline.contacted}</span>
              </div>

              <div
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: colors.surface2 }}
              >
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5" style={{ color: colors.pink }} />
                  <span style={{ color: colors.textPrimary }}>Offered</span>
                </div>
                <span className="text-xl" style={{ ...displayHeading, color: colors.accent }}>{analytics.recruitingPipeline.offered}</span>
              </div>

              <div
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: colors.surface2 }}
              >
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5" style={{ color: colors.neon }} />
                  <span style={{ color: colors.textPrimary }}>Committed</span>
                </div>
                <span className="text-xl" style={{ ...displayHeading, color: colors.accent }}>{analytics.recruitingPipeline.committed}</span>
              </div>
            </div>
          </Card>

          {/* Top Recruiting States */}
          <Card className="p-6">
            <h3 className="text-lg mb-6" style={{ ...displayHeading, color: colors.textPrimary }}>Top Recruiting States</h3>
            {topRecruitingStates.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<MapPin className="w-10 h-10" />}
                title="No state data yet"
                body="Save prospects to your board and their home states will rank here."
              />
            ) : (
              <div className="space-y-3">
                {topRecruitingStates.map((state, index) => {
                  const tone = rankTones[index] ?? colors.textTertiary;
                  return (
                    <div key={state.state} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: `${tone}1A`,
                            color: tone,
                            border: `1px solid ${tone}33`,
                          }}
                        >
                          {index + 1}
                        </div>
                        <MapPin className="w-4 h-4" style={{ color: colors.textSecondary }} />
                        <span style={{ color: colors.textPrimary }}>{state.state}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>{state.players}</span>
                        <span className="text-sm ml-2" style={{ color: colors.textSecondary }}>({state.percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Activity */}
          <Card className="p-6">
            <h3 className="text-lg mb-6" style={{ ...displayHeading, color: colors.textPrimary }}>Weekly Activity</h3>
            {analytics.weeklyActivity.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<CalendarClock className="w-10 h-10" />}
                title="No weekly activity yet"
                body="Your searches, views, and saves from the past week will chart here."
              />
            ) : (
              <div className="space-y-3">
                {analytics.weeklyActivity.map((day) => (
                  <div
                    key={day.day}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: colors.surface2 }}
                  >
                    <span className="font-medium w-12" style={{ color: colors.textPrimary }}>{day.day}</span>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold" style={{ color: colors.accent }}>{day.searches}</div>
                        <div style={{ color: colors.textSecondary }}>searches</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold" style={{ color: colors.neon }}>{day.views}</div>
                        <div style={{ color: colors.textSecondary }}>views</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold" style={{ color: colors.pink }}>{day.saves}</div>
                        <div style={{ color: colors.textSecondary }}>saves</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Position Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg mb-6" style={{ ...displayHeading, color: colors.textPrimary }}>Board Position Breakdown</h3>
            {analytics.positionBreakdown.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<BarChart3 className="w-10 h-10" />}
                title="No board positions yet"
                body="Add players to your board and the position mix will break down here."
              />
            ) : (
              <div className="space-y-4">
                {analytics.positionBreakdown.map((pos) => (
                  <div key={pos.position} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: colors.textPrimary }}>{pos.position}</span>
                      <span style={{ color: colors.textSecondary }}>{pos.count} players ({pos.percentage}%)</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ background: colors.surface2 }}>
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pos.percentage}%`, background: colors.accent }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
