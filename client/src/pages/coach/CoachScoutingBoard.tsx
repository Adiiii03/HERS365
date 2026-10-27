import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, Trash2, Award, LayoutGrid, List } from 'lucide-react';
import type { ScoutingBoardItem, PlayerSearchResult } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { Button, Card, EmptyState, CardSkeleton } from '../../components/ui';
import { colors, radii } from '../../lib/tokens';
import { isDemoCoach } from '../../components/coach/demoCoach';
import { scoutingPhoto } from '../../components/coach/demoImages';
import { DiamondRating, StatBoxes } from '../../components/coach/CardStats';
import { fullPosition, fullStateName, expandSchool } from '../../components/coach/labels';

const TIERS = [
  { id: 'top-target', label: 'Top Targets', dot: colors.danger, description: 'Priority recruits' },
  { id: 'watching', label: 'Watching', dot: colors.pink, description: 'Prospects to monitor' },
  { id: 'offered', label: 'Offered', dot: colors.success, description: 'Players with offers' },
] as const;

const DISPLAY = "'Barlow Condensed', sans-serif";

export function CoachScoutingBoard() {
  const [board, setBoard] = useState<ScoutingBoardItem[]>([]);
  const [players, setPlayers] = useState<Map<number, PlayerSearchResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTier, setActiveTier] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesText, setNotesText] = useState('');
  const { showNotification } = useNotifications();
  // Demo coach only: flag-football placeholder photos on the cards. Real coaches never
  // see a fabricated portrait painted onto a real athlete.
  const demo = isDemoCoach();

  useEffect(() => {
    fetchScoutingBoard();
  }, []);

  const fetchScoutingBoard = async () => {
    setLoadError(false);
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch('/api/coach/board', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBoard(data.board || []);

        // The detail endpoint (/coach/players/:id) doesn't carry the derived height/weight that
        // Search shows, so pull those from the search endpoint once and merge by id — keeps the
        // board's stat boxes consistent with Player Search. Frontend-only, no backend change.
        const derivedById = new Map<number, { height: string; weight: number }>();
        try {
          const searchRes = await fetch('/api/coach/players/search?limit=200', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            (searchData.players || []).forEach((p: PlayerSearchResult) => {
              derivedById.set(p.id, { height: p.height, weight: p.weight });
            });
          }
        } catch { /* fall back to whatever the detail endpoint provides */ }

        // Fetch player details for each board item
        const playerPromises = data.board.map(async (item: ScoutingBoardItem) => {
          try {
            const playerResponse = await fetch(`/api/coach/players/${item.athleteId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (playerResponse.ok) {
              const playerData = await playerResponse.json();
              return { id: item.athleteId, data: playerData };
            }
          } catch {
            showNotification('error', 'Player Load Failed', `Could not load data for player ${item.athleteId}.`);
          }
          return null;
        });

        const playerResults = await Promise.all(playerPromises);
        const playerMap = new Map<number, PlayerSearchResult>();
        playerResults.forEach(result => {
          if (result) {
            // Convert full profile to search result format
            const player: PlayerSearchResult = {
              id: result.data.id,
              name: result.data.name,
              position: result.data.position,
              state: result.data.state,
              city: result.data.city,
              school: result.data.school,
              gradYear: result.data.gradYear,
              height: result.data.height ?? derivedById.get(result.data.id)?.height ?? null,
              weight: result.data.weight ?? derivedById.get(result.data.id)?.weight ?? null,
              gpa: result.data.gpa,
              breakoutScore: result.data.breakoutScore,
              stars: result.data.stars,
              archetype: result.data.archetype,
              stats: result.data.stats,
              combineStats: result.data.combineStats,
              highlights: result.data.highlights?.length || 0,
              verified: result.data.verified || false,
              offers: result.data.offers?.length || 0,
              committed: result.data.committed || false,
              nilPoints: result.data.nilPoints,
            };
            playerMap.set(result.id, player);
          }
        });
        setPlayers(playerMap);
      }
    } catch {
      setLoadError(true);
      showNotification('error', 'Load Failed', 'Could not load your scouting board. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const removeFromBoard = async (playerId: number) => {
    const playerName = players.get(playerId)?.name;
    try {
      const token = localStorage.getItem('coachToken');
      await fetch(`/api/coach/players/${playerId}/save`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setBoard(prev => prev.filter(item => item.athleteId !== playerId));
      showNotification('info', 'Removed from Board', playerName ? `${playerName} was removed from your board.` : 'Player removed from your board.');
    } catch {
      showNotification('error', 'Remove Failed', 'Could not remove player from board. Please try again.');
    }
  };

  const updateTier = async (playerId: number, newTier: string) => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/api/coach/players/${playerId}/tier`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: newTier }),
      });

      if (response.ok) {
        setBoard(prev => prev.map(item =>
          item.athleteId === playerId ? { ...item, tier: newTier as ScoutingBoardItem['tier'] } : item
        ));
        const tierLabel = TIERS.find(t => t.id === newTier)?.label ?? newTier;
        const playerName = players.get(playerId)?.name;
        showNotification('success', 'Tier Updated', playerName ? `${playerName} moved to ${tierLabel}.` : `Player moved to ${tierLabel}.`);
      }
    } catch {
      showNotification('error', 'Update Failed', 'Could not update player tier. Please try again.');
    }
  };

  const updateNotes = async (playerId: number, notes: string) => {
    try {
      const token = localStorage.getItem('coachToken');
      await fetch(`/api/coach/players/${playerId}/notes`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      setBoard(prev => prev.map(item =>
        item.athleteId === playerId ? { ...item, notes } : item
      ));
      setEditingNotes(null);
      setNotesText('');
    } catch {
      showNotification('error', 'Save Failed', 'Could not save notes. Please try again.');
    }
  };

  const startEditingNotes = (playerId: number, currentNotes: string) => {
    setEditingNotes(playerId);
    setNotesText(currentNotes || '');
  };

  const filteredBoard = activeTier === 'all'
    ? board
    : board.filter(item => item.tier === activeTier);

  const getTierStats = (tierId: string) => {
    return board.filter(item => item.tier === tierId).length;
  };

  // Fully-written identity line: "Quarterback • Westlake High School • Austin, Texas".
  const identityText = (p: PlayerSearchResult) =>
    [fullPosition(p.position), expandSchool(p.school), [p.city, fullStateName(p.state)].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' • ');

  // Compact list row (notes + tier editing stay in the grid card to keep the row scannable).
  const renderListRow = (item: ScoutingBoardItem, player: PlayerSearchResult, tierInfo?: typeof TIERS[number]) => (
    <Card key={item.athleteId} className="p-4 flex items-center gap-4">
      <Link to={`/coach/player/${player.id}`} className="shrink-0">
        {demo ? (
          <img src={scoutingPhoto(item.athleteId)} alt="" aria-hidden="true" className="w-14 h-14 rounded-full object-cover" style={{ background: colors.surface2 }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: colors.surface2, color: colors.textTertiary }}>
            {player.name?.[0] ?? '?'}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold truncate" style={{ fontFamily: DISPLAY, color: colors.textPrimary }}>{player.name}</h3>
          {player.verified && <Award className="w-4 h-4 shrink-0" style={{ color: colors.accentText }} />}
        </div>
        <p className="text-xs truncate" style={{ color: colors.textSecondary }}>{identityText(player)} • Class of {player.gradYear}</p>
        <div className="mt-1"><DiamondRating rating={player.stars} showLabel={false} /></div>
      </div>
      <div className="hidden lg:block w-[300px] shrink-0">
        <StatBoxes gpa={player.gpa} height={player.height} weight={player.weight} projected={isDemoCoach()} />
      </div>
      {tierInfo && (
        <div className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium shrink-0" style={{ background: tierInfo.dot, color: colors.surface0 }}>
          <div className="w-2 h-2 rounded-full" style={{ background: colors.surface0 }}></div>
          {tierInfo.label}
        </div>
      )}
      <div className="flex items-center gap-2 shrink-0">
        <Link to={`/coach/player/${player.id}`} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg" style={{ background: colors.surface2, color: colors.accentText }}>
          <Eye className="w-4 h-4" /> Profile
        </Link>
        <button
          onClick={() => removeFromBoard(item.athleteId)}
          aria-label={`Remove ${player.name} from board`}
          className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg"
          style={{ color: colors.textSecondary }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen" style={{ background: colors.surface0, color: colors.textPrimary }}>
      {/* Header */}
      <div style={{ background: colors.surface1, borderBottom: `1px solid ${colors.border}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ fontFamily: DISPLAY, letterSpacing: '-0.02em', color: colors.textPrimary }}
              >
                Scouting Board
              </h1>
              <p className="mt-2" style={{ color: colors.textSecondary }}>Manage your recruiting pipeline</p>
            </div>
            <Link to="/coach/search">
              <Button variant="primary">Find More Players</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tier Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setActiveTier('all')}
              className="px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={
                activeTier === 'all'
                  ? { background: colors.accent, color: colors.accentOn, ['--tw-ring-color' as string]: colors.accent }
                  : { background: colors.surface1, color: colors.textSecondary, ['--tw-ring-color' as string]: colors.accent }
              }
            >
              All Players ({board.length})
            </button>
            {TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setActiveTier(tier.id)}
                className="px-4 py-2 min-h-[44px] rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={
                  activeTier === tier.id
                    ? { background: tier.dot, color: colors.surface0, ['--tw-ring-color' as string]: colors.accent }
                    : { background: colors.surface1, color: colors.textSecondary, ['--tw-ring-color' as string]: colors.accent }
                }
              >
                {tier.label} ({getTierStats(tier.id)})
              </button>
            ))}
          </div>

          {/* Tier summary strip — big purple counts, like Valerie's mockup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <Card key={tier.id} className="p-4">
                <p
                  className="font-bold"
                  style={{ fontFamily: DISPLAY, fontSize: '2rem', lineHeight: 1.05, color: colors.accentText }}
                >
                  {getTierStats(tier.id)} players
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: tier.dot }}></div>
                  <h3
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ fontFamily: DISPLAY, color: colors.textSecondary }}
                  >
                    {tier.label}
                  </h3>
                </div>
                <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>{tier.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Grid/list toggle */}
        {!loading && !loadError && filteredBoard.length > 0 && (
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
              <button
                onClick={() => setView('grid')}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                className="p-2 rounded transition-colors"
                style={{ background: view === 'grid' ? colors.accent : 'transparent', color: view === 'grid' ? colors.accentOn : colors.textSecondary }}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
                className="p-2 rounded transition-colors"
                style={{ background: view === 'list' ? colors.accent : 'transparent', color: view === 'list' ? colors.accentOn : colors.textSecondary }}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Board Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={<Heart className="w-12 h-12" />}
            title="Could not load your scouting board."
            cta={
              <Button variant="primary" onClick={() => { setLoading(true); fetchScoutingBoard(); }}>
                Retry
              </Button>
            }
          />
        ) : filteredBoard.length === 0 ? (
          <EmptyState
            icon={<Heart className="w-12 h-12" />}
            title={activeTier === 'all' ? 'Your scouting board is empty' : `No players in ${TIERS.find(t => t.id === activeTier)?.label}`}
            body={activeTier === 'all'
              ? 'Start by searching for players and adding them to your board'
              : 'Try changing the filter or adding players to this tier'}
            cta={
              <Link to="/coach/search">
                <Button variant="primary" size="lg">Search Players</Button>
              </Link>
            }
          />
        ) : view === 'list' ? (
          <div className="flex flex-col gap-3">
            {filteredBoard.map((item) => {
              const player = players.get(item.athleteId);
              if (!player) return null;
              const tierInfo = TIERS.find(t => t.id === item.tier);
              return renderListRow(item, player, tierInfo);
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoard.map((item) => {
              const player = players.get(item.athleteId);
              if (!player) return null;

              const tierInfo = TIERS.find(t => t.id === item.tier);

              return (
                <Card key={item.athleteId} hover className="overflow-hidden">
                  {demo && (
                    <div className="relative aspect-[2/1] overflow-hidden">
                      <img
                        src={scoutingPhoto(item.athleteId)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(10,10,12,0.92) 0%, rgba(10,10,12,0.15) 45%, rgba(10,10,12,0) 100%)' }}
                      />
                      {tierInfo && (
                        <div
                          className="absolute top-3 left-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: tierInfo.dot, color: colors.surface0 }}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ background: colors.surface0 }}></div>
                          {tierInfo.label}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className="text-xl font-semibold"
                            style={{ fontFamily: DISPLAY, color: colors.textPrimary }}
                          >
                            {player.name}
                          </h3>
                          {player.verified && (
                            <Award className="w-5 h-5" style={{ color: colors.accentText }} />
                          )}
                        </div>
                        <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>{identityText(player)}</p>
                        <p className="text-xs mb-2" style={{ color: colors.textTertiary }}>Class of {player.gradYear}</p>
                        {!demo && (
                          <div
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: tierInfo?.dot, color: colors.surface0 }}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ background: colors.surface0 }}></div>
                            {tierInfo?.label}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromBoard(item.athleteId)}
                        aria-label={`Remove ${player.name} from board`}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{ color: colors.textSecondary, ['--tw-ring-color' as string]: colors.accent }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 mb-4">
                      <DiamondRating rating={player.stars} />
                      <StatBoxes gpa={player.gpa} height={player.height} weight={player.weight} projected={isDemoCoach()} />
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: colors.textSecondary }}>NIL Points</span>
                        <span className="text-lg font-semibold" style={{ color: colors.pinkText }}>{(player.nilPoints ?? 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Tier Selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Change Tier</label>
                      <select
                        value={item.tier}
                        onChange={(e) => updateTier(item.athleteId, e.target.value)}
                        className="w-full px-3 py-2 text-sm"
                        style={{
                          background: colors.surface2,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radii.sm,
                          color: colors.textPrimary,
                        }}
                      >
                        {TIERS.map((tier) => (
                          <option key={tier.id} value={tier.id}>{tier.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Notes</label>
                      {editingNotes === item.athleteId ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className="w-full px-3 py-2 text-sm h-20 resize-none"
                            style={{
                              background: colors.surface2,
                              border: `1px solid ${colors.border}`,
                              borderRadius: radii.sm,
                              color: colors.textPrimary,
                            }}
                            placeholder="Add notes about this player..."
                          />
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => updateNotes(item.athleteId, notesText)}>
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingNotes(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingNotes(item.athleteId, item.notes || '')}
                          className="w-full text-left px-3 py-2 text-sm min-h-[2.5rem] cursor-pointer transition-colors"
                          style={{
                            background: colors.surface2,
                            border: `1px solid ${colors.border}`,
                            borderRadius: radii.sm,
                            color: colors.textPrimary,
                          }}
                        >
                          {item.notes ? (
                            <span style={{ color: colors.textSecondary }}>{item.notes}</span>
                          ) : (
                            <span className="italic" style={{ color: colors.textTertiary }}>Click to add notes...</span>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Link
                        to={`/coach/player/${player.id}`}
                        className="flex items-center gap-2 transition-colors"
                        style={{ color: colors.accentText }}
                      >
                        <Eye className="w-4 h-4" />
                        View Profile
                      </Link>
                      <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {player.offers} offers • {player.highlights} highlights
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
