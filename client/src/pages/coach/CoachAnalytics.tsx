import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Eye,
  MessageSquare,
  MapPin,
  TrendingUp,
  CalendarDays,
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { Button, Card, EmptyState } from '../../components/ui';
import { StatCardSkeleton, CardSkeleton } from '../../components/ui';
import { colors, type as t } from '../../lib/tokens';
import { fullPosition } from '../../components/coach/labels';
import { isDemoCoach } from '../../components/coach/demoCoach';

type CoachAnalyticsResponse = {
  boardCount: number;
  messagesSent: number;
  playersContacted: number;
  topStates: { state: string; players: number; percentage: number }[];
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

// Analytics needs more than one accent so a coach can tell series/categories apart. Violet is the
// brand; cyan/amber/emerald/rose/teal are the categorical colors (matches Valerie's mockup).
const cat = {
  violet: colors.accent, // #8B3BFF
  cyan: '#29D6FF',
  amber: '#FDBE2E',
  emerald: '#2EF8A1',
  rose: '#FF5F7A',
  teal: '#2DD4BF',
} as const;

const donutPalette = [cat.violet, cat.cyan, cat.amber, cat.emerald, cat.rose, '#9EA3B1'];

const displayHeading = {
  fontFamily: t.font.display,
  fontWeight: t.weight.bold,
  textTransform: 'uppercase' as const,
  letterSpacing: t.tracking.h2,
};

const metricNumeral = {
  fontFamily: t.font.display,
  fontWeight: t.weight.bold,
  fontSize: t.size['4xl'],
  lineHeight: 1,
};

const axisTitle = { fontFamily: t.font.display, letterSpacing: '0.08em' };

// ─── Small, self-contained SVG charts (no charting dependency) ───────────────

function WeeklyLineChart({ data }: { data: CoachAnalyticsResponse['weeklyActivity'] }) {
  const W = 680;
  const H = 250;
  const padL = 48;
  const padR = 14;
  const padT = 16;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...data.flatMap(d => [d.searches, d.views]));
  const x = (i: number) => (data.length <= 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const points = (key: 'searches' | 'views') => data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ');
  const gridVals = [0, Math.round(max / 2), max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img" aria-label="Weekly activity line chart">
      {gridVals.map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke={colors.border} strokeWidth={1} />
          <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize={11} fill={colors.textTertiary}>{g}</text>
        </g>
      ))}
      {(['searches', 'views'] as const).map((key) => (
        <polyline
          key={key}
          points={points(key)}
          fill="none"
          stroke={key === 'searches' ? cat.violet : cat.amber}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {(['searches', 'views'] as const).map((key) =>
        data.map((d, i) => (
          <circle key={`${key}-${i}`} cx={x(i)} cy={y(d[key])} r={3.5} fill={key === 'searches' ? cat.violet : cat.amber} />
        )),
      )}
      {data.map((d, i) => (
        <text key={`lbl-${i}`} x={x(i)} y={padT + innerH + 18} textAnchor="middle" fontSize={12} fill={colors.textSecondary}>{d.day}</text>
      ))}
      {/* Axis titles */}
      <text x={padL + innerW / 2} y={H - 6} textAnchor="middle" fontSize={12} fill={colors.textTertiary} style={axisTitle}>DAY</text>
      <text x={14} y={padT + innerH / 2} textAnchor="middle" fontSize={12} fill={colors.textTertiary} style={axisTitle} transform={`rotate(-90 14 ${padT + innerH / 2})`}>COUNT</text>
    </svg>
  );
}

function EngagementAreaChart({ data }: { data: { label: string; value: number }[] }) {
  const W = 980;
  const H = 260;
  const padL = 54;
  const padR = 16;
  const padT = 16;
  const padB = 46;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...data.map(d => d.value));
  const x = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const baseline = y(0);
  const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPath = `M ${x(0)},${baseline} L ${data.map((d, i) => `${x(i)},${y(d.value)}`).join(' L ')} L ${x(data.length - 1)},${baseline} Z`;
  const gridVals = [0, Math.round(max / 2), max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img" aria-label="Engagement over time area chart (sample data)">
      <defs>
        <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cat.teal} stopOpacity={0.35} />
          <stop offset="100%" stopColor={cat.teal} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridVals.map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke={colors.border} strokeWidth={1} />
          <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize={11} fill={colors.textTertiary}>{g}</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#engGrad)" />
      <polyline points={linePts} fill="none" stroke={cat.teal} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={3} fill={cat.teal} />
      ))}
      {data.map((d, i) => (
        i % 2 === 0 ? (
          <text key={`xl-${i}`} x={x(i)} y={padT + innerH + 18} textAnchor="middle" fontSize={11} fill={colors.textSecondary}>{d.label}</text>
        ) : null
      ))}
      <text x={padL + innerW / 2} y={H - 6} textAnchor="middle" fontSize={12} fill={colors.textTertiary} style={axisTitle}>DATE</text>
      <text x={16} y={padT + innerH / 2} textAnchor="middle" fontSize={12} fill={colors.textTertiary} style={axisTitle} transform={`rotate(-90 16 ${padT + innerH / 2})`}>ATHLETE INTEREST</text>
    </svg>
  );
}

// Sample engagement series — only ever rendered for the demo coach, and always behind a visible
// "SAMPLE" label so it is never mistaken for real data (honesty rule, same gate as The Grid demo).
const engagementSample = [
  { label: 'Mar 1', value: 12 },
  { label: 'Mar 4', value: 17 },
  { label: 'Mar 8', value: 21 },
  { label: 'Mar 11', value: 26 },
  { label: 'Mar 15', value: 30 },
  { label: 'Mar 18', value: 37 },
  { label: 'Mar 22', value: 43 },
  { label: 'Mar 25', value: 52 },
  { label: 'Mar 29', value: 61 },
  { label: 'Mar 31', value: 69 },
];

// ─── Page ────────────────────────────────────────────────────────────────────

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
        <div className="px-6 lg:px-8 py-8">
          <div className="h-28 w-full rounded-xl animate-pulse mb-6" style={{ background: colors.surface1 }} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

  const { recruitingPipeline: pipe } = analytics;

  const hasAnyActivity =
    analytics.boardCount > 0 ||
    analytics.messagesSent > 0 ||
    analytics.totalPlayersViewed > 0 ||
    analytics.searchQueriesThisWeek > 0;

  const summaryCards = [
    { label: 'Board Size', value: String(analytics.boardCount), sub: 'prospects on your board', icon: Users, color: cat.violet },
    { label: 'Players Viewed', value: String(analytics.totalPlayersViewed), sub: 'profiles opened', icon: Eye, color: cat.cyan },
    { label: 'Messages Sent', value: String(analytics.messagesSent), sub: 'total sent', icon: MessageSquare, color: cat.amber },
    { label: 'Conversion Rate', value: `${analytics.boardConversionRate}%`, sub: 'board to contact', icon: TrendingUp, color: cat.emerald },
  ];

  // Pipeline stages. Prospects/Contacted/Offered are real; Committed has no data source (there is
  // no 'committed' tier) so it renders muted, never a fabricated number.
  const pipeMax = Math.max(1, pipe.prospects, pipe.contacted, pipe.offered, pipe.committed);
  const stages = [
    { label: 'Prospects', count: pipe.prospects, color: cat.violet, real: true },
    { label: 'Contacted', count: pipe.contacted, color: cat.cyan, real: true },
    { label: 'Offered', count: pipe.offered, color: cat.amber, real: true },
    { label: 'Committed', count: pipe.committed, color: cat.emerald, real: false },
  ];

  const topStateMax = Math.max(1, ...analytics.topStates.map(s => s.players));
  const positionTotal = analytics.positionBreakdown.reduce((sum, p) => sum + p.count, 0);
  const weeklyHasData = analytics.weeklyActivity.some(d => d.searches > 0 || d.views > 0);
  const showSampleEngagement = isDemoCoach();

  return (
    <div className="min-h-screen" style={{ background: colors.surface0, color: colors.textPrimary }}>
      <div className="px-6 lg:px-8 py-8 space-y-6">
        {/* Hero */}
        <div
          className="relative rounded-xl px-7 py-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0C0F15 0%, #090A0F 100%)', border: `1px solid ${colors.border}` }}
        >
          <div>
            <h1 className="text-5xl" style={displayHeading}>
              <span style={{ color: colors.textPrimary }}>RECRUITING </span>
              <span style={{ color: cat.violet }}>ANALYTICS</span>
            </h1>
            <p className="mt-2 text-base" style={{ color: colors.textSecondary }}>
              Track your recruiting performance and engagement.
            </p>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: colors.surface1, border: `1px solid ${cat.violet}`, color: colors.textPrimary }}
          >
            <CalendarDays className="w-4 h-4" />
            Last 30 days
          </div>
        </div>

        {!hasAnyActivity && (
          <Card className="p-6 text-center">
            <p style={{ color: colors.textPrimary, fontWeight: t.weight.medium }}>No recruiting activity yet</p>
            <p className="text-sm mt-1" style={{ color: colors.textTertiary }}>
              Start searching for players and saving prospects to your board to see analytics here.
            </p>
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{ background: `${c.color}14`, border: `1px solid ${c.color}40` }}
                  >
                    <Icon className="w-[22px] h-[22px]" style={{ color: c.color }} />
                  </div>
                  <span className="text-sm" style={{ ...displayHeading, color: colors.textPrimary, letterSpacing: '0.06em' }}>{c.label}</span>
                </div>
                <p style={{ ...metricNumeral, color: c.color }}>{c.value}</p>
                <p className="text-xs mt-1.5" style={{ color: colors.textTertiary }}>{c.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Pipeline + Top States */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-2xl mb-5" style={{ ...displayHeading, color: colors.textPrimary }}>Recruiting Pipeline</h3>
            <div className="space-y-5">
              {stages.map((s) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5 w-32 shrink-0">
                    <span className="w-3 h-3 rounded-full" style={{ background: s.real ? s.color : colors.border }} />
                    <span className="text-base" style={{ color: s.real ? colors.textPrimary : colors.textTertiary }}>{s.label}</span>
                  </div>
                  <div className="flex-1 h-2.5 rounded-full" style={{ background: colors.surface2 }}>
                    <div
                      className="h-2.5 rounded-full"
                      style={{ width: `${(s.count / pipeMax) * 100}%`, background: s.real ? s.color : colors.border }}
                    />
                  </div>
                  {s.real ? (
                    <span className="w-10 text-right" style={{ ...displayHeading, fontSize: t.size['2xl'], color: s.color }}>{s.count}</span>
                  ) : (
                    <span className="w-10 text-right text-base" style={{ color: colors.textTertiary }} title="No committed tier yet">—</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs mt-5" style={{ color: colors.textTertiary }}>
              Prospects, Contacted and Offered are live. Committed is coming soon.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-2xl mb-5" style={{ ...displayHeading, color: colors.textPrimary }}>Top Recruiting States</h3>
            {analytics.topStates.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<MapPin className="w-10 h-10" />}
                title="No state data yet"
                body="Save prospects and their home states will rank here."
              />
            ) : (
              <div className="space-y-4">
                {analytics.topStates.map((s, index) => (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="text-sm w-4 text-right" style={{ color: colors.textTertiary }}>{index + 1}</span>
                    <span className="text-base w-8 font-semibold" style={{ color: colors.textPrimary }}>{s.state}</span>
                    <div className="flex-1 h-2.5 rounded-full" style={{ background: colors.surface2 }}>
                      <div className="h-2.5 rounded-full" style={{ width: `${(s.players / topStateMax) * 100}%`, background: cat.cyan }} />
                    </div>
                    <span className="text-base w-6 text-right font-semibold" style={{ color: cat.cyan }}>{s.players}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Weekly Activity + Position Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl" style={{ ...displayHeading, color: colors.textPrimary }}>Weekly Activity</h3>
              <div className="flex items-center gap-4 text-sm" style={{ color: colors.textSecondary }}>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: cat.violet }} />Searches</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: cat.amber }} />Profile Views</span>
              </div>
            </div>
            {weeklyHasData ? (
              <WeeklyLineChart data={analytics.weeklyActivity} />
            ) : (
              <EmptyState
                className="py-8"
                icon={<CalendarClock className="w-10 h-10" />}
                title="No activity this week"
                body="Your searches and profile views from the past 7 days will chart here."
              />
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-2xl mb-5" style={{ ...displayHeading, color: colors.textPrimary }}>Board Position Breakdown</h3>
            {positionTotal === 0 ? (
              <EmptyState
                className="py-8"
                icon={<BarChart3 className="w-10 h-10" />}
                title="No board positions yet"
                body="Add players to your board and the position mix will break down here."
              />
            ) : (
              <div className="flex flex-col items-center gap-5">
                <PositionDonut data={analytics.positionBreakdown} total={positionTotal} />
                <div className="w-full">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs uppercase tracking-wide pb-1.5 mb-1.5" style={{ color: colors.textTertiary, borderBottom: `1px solid ${colors.border}` }}>
                    <span>Position</span>
                    <span className="text-right">Players</span>
                    <span className="text-right">Share</span>
                  </div>
                  {analytics.positionBreakdown.map((p, i) => (
                    <div key={p.position} className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-base py-1.5 items-center">
                      <span className="flex items-center gap-2" style={{ color: colors.textPrimary }}>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: donutPalette[i % donutPalette.length] }} />
                        {fullPosition(p.position)}
                      </span>
                      <span className="text-right" style={{ color: colors.textSecondary }}>{p.count}</span>
                      <span className="text-right" style={{ color: colors.textSecondary }}>{p.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Engagement Over Time — sample data for the demo coach only (clearly labeled); every other
            coach / prod build keeps the honest empty state. */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-2xl" style={{ ...displayHeading, color: colors.textPrimary }}>Engagement Over Time</h3>
            <span
              className="text-xs uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={{ background: colors.surface2, color: colors.textTertiary, border: `1px solid ${colors.border}` }}
            >
              {showSampleEngagement ? 'Sample' : 'Coming soon'}
            </span>
          </div>
          {showSampleEngagement ? (
            <div>
              <EngagementAreaChart data={engagementSample} />
              <p className="text-xs mt-2" style={{ color: colors.textTertiary }}>
                Sample data, for preview. Live athlete-interest tracking is coming soon.
              </p>
            </div>
          ) : (
            <EmptyState
              className="py-8"
              icon={<TrendingUp className="w-10 h-10" />}
              title="Athlete interest trend coming soon"
              body="Once engagement tracking is live, athlete interest over time will chart here."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function PositionDonut({ data, total }: { data: CoachAnalyticsResponse['positionBreakdown']; total: number }) {
  const size = 160;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  // Precompute each segment's arc length + cumulative offset before render so the
  // JSX map doesn't mutate an outer variable during render (lint: no reassign after render).
  const segments: { position: string; len: number; offset: number }[] = [];
  let running = 0;
  for (const d of data) {
    const len = (total > 0 ? d.count / total : 0) * circ;
    segments.push({ position: d.position, len, offset: running });
    running += len;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label="Board position breakdown donut">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.surface2} strokeWidth={stroke} />
        {segments.map((s, i) => (
          <circle
            key={s.position}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={donutPalette[i % donutPalette.length]}
            strokeWidth={stroke}
            strokeDasharray={`${s.len} ${circ - s.len}`}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ ...displayHeading, fontSize: t.size['3xl'], color: colors.textPrimary }}>{total}</span>
        <span className="text-xs uppercase tracking-wide" style={{ color: colors.textTertiary }}>Players</span>
      </div>
    </div>
  );
}
