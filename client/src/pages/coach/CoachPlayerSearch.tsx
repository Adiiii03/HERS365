import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Star, MapPin, GraduationCap, Users, Heart } from 'lucide-react';
import type { PlayerSearchResult } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { StatsVerificationStatus } from '../../components/StatsVerificationStatus';
import { Button, EmptyState } from '../../components/ui';

interface SearchFilters {
  q?: string;
  position?: string;
  state?: string;
  gradYear?: string;
  minBreakoutScore?: string;
  maxBreakoutScore?: string;
  minGpa?: string;
  maxGpa?: string;
  minHeight?: string;
  maxHeight?: string;
  minWeight?: string;
  maxWeight?: string;
  verified?: boolean;
  archetype?: string;
}

const POSITIONS = [
  'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'ATH'
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const GRAD_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

export function CoachPlayerSearch() {
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [savedPlayers, setSavedPlayers] = useState<Set<number>>(new Set());
  const { showNotification } = useNotifications();

  useEffect(() => {
    searchPlayers();
  }, [filters]);

  const searchPlayers = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.set(key, value.toString());
        }
      });
      queryParams.set('limit', '50');

      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/api/coach/players/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(Array.isArray(data?.players) ? data.players : []);
      }
    } catch {
      setLoadError(true);
      showNotification('error', 'Search Failed', 'Could not complete the search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSavePlayer = async (playerId: number) => {
    const token = localStorage.getItem('coachToken');
    const isSaved = savedPlayers.has(playerId);

    try {
      if (isSaved) {
        await fetch(`/api/coach/players/${playerId}/save`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setSavedPlayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
      } else {
        await fetch(`/api/coach/players/${playerId}/save`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier: 'watching' }),
        });
        setSavedPlayers(prev => new Set(prev).add(playerId));
      }
    } catch {
      showNotification('error', 'Save Failed', 'Could not update player save status. Please try again.');
    }
  };

  const updateFilter = (key: keyof SearchFilters, value: SearchFilters[typeof key]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-current' : 'text-ink-faint'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display uppercase tracking-tight text-3xl font-bold text-ink">Player Search</h1>
              <p className="text-ink-muted mt-2">Discover and recruit top talent</p>
            </div>
            <Link
              to="/coach/board"
              className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View Scouting Board
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-ink-muted" />
              <input
                type="text"
                placeholder="Search players by name, school, or location..."
                value={filters.q || ''}
                onChange={(e) => updateFilter('q', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-card border border-surface-border rounded-lg text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-surface-card border border-surface-border rounded-lg hover:bg-surface-hover transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-surface-card border border-surface-border rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Position</label>
                <select
                  value={filters.position || ''}
                  onChange={(e) => updateFilter('position', e.target.value)}
                  className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                >
                  <option value="">All Positions</option>
                  {POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">State</label>
                <select
                  value={filters.state || ''}
                  onChange={(e) => updateFilter('state', e.target.value)}
                  className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                >
                  <option value="">All States</option>
                  {STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Grad Year</label>
                <select
                  value={filters.gradYear || ''}
                  onChange={(e) => updateFilter('gradYear', e.target.value)}
                  className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                >
                  <option value="">All Years</option>
                  {GRAD_YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Archetype</label>
                <select
                  value={filters.archetype || ''}
                  onChange={(e) => updateFilter('archetype', e.target.value)}
                  className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                >
                  <option value="">All Archetypes</option>
                  <option value="Speedster">Speedster</option>
                  <option value="Dual-Threat">Dual-Threat</option>
                  <option value="Lockdown">Lockdown</option>
                  <option value="Power Back">Power Back</option>
                  <option value="Pocket Passer">Pocket Passer</option>
                  <option value="Playmaker">Playmaker</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Breakout Score Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minBreakoutScore || ''}
                    onChange={(e) => updateFilter('minBreakoutScore', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.maxBreakoutScore || ''}
                    onChange={(e) => updateFilter('maxBreakoutScore', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">GPA Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.1"
                    value={filters.minGpa || ''}
                    onChange={(e) => updateFilter('minGpa', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="0"
                    max="4"
                    step="0.1"
                    value={filters.maxGpa || ''}
                    onChange={(e) => updateFilter('maxGpa', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Height Range (inches)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="60"
                    max="84"
                    value={filters.minHeight || ''}
                    onChange={(e) => updateFilter('minHeight', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="60"
                    max="84"
                    value={filters.maxHeight || ''}
                    onChange={(e) => updateFilter('maxHeight', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Weight Range (lbs)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="100"
                    max="400"
                    value={filters.minWeight || ''}
                    onChange={(e) => updateFilter('minWeight', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="100"
                    max="400"
                    value={filters.maxWeight || ''}
                    onChange={(e) => updateFilter('maxWeight', e.target.value)}
                    className="w-full bg-surface-hover border border-surface-border rounded px-3 py-2 text-ink"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <label className="block text-sm font-medium text-ink-muted mb-2">Verified Stats Only</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.verified || false}
                      onChange={(e) => updateFilter('verified', e.target.checked)}
                      className="w-4 h-4 accent-accent-500 bg-surface-hover border-surface-border rounded focus:ring-accent-500"
                    />
                    <span className="ml-2 text-sm text-ink-muted">Show confirmed official stats only</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={clearFilters}
                className="px-4 py-2 min-h-[44px] rounded-lg text-ink-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-ink-muted">
              {loading ? 'Searching...' : `${players.length} players found`}
            </p>
          </div>
        </div>

        {/* Player Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => (
            <div key={player.id} className="bg-surface-card border border-surface-border rounded-lg overflow-hidden hover:border-accent-500/40 transition-colors">
              {/* Film/photo strip — uses the latest highlight thumbnail when present,
                  falling back to the athlete's profile photo, then to a placeholder.
                  Lets coaches eyeball candidates without clicking every card. */}
              <Link
                to={`/coach/player/${player.id}`}
                className="block aspect-video bg-surface relative overflow-hidden group"
              >
                {player.highlightThumbnailUrl || player.profileImage ? (
                  <img
                    src={player.highlightThumbnailUrl || player.profileImage || undefined}
                    alt={`${player.name} preview`}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center text-2xl font-bold text-ink-faint">
                      {player.name?.[0] ?? '?'}
                    </div>
                  </div>
                )}
                {player.highlightThumbnailUrl && (
                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/70 backdrop-blur px-2 py-1 rounded text-xs font-medium text-white">
                    ▶ Highlights
                  </div>
                )}
              </Link>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink">{player.name}</h3>
                    </div>
                    <div className="mb-2">
                      <StatsVerificationStatus verified={player.verified} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink-muted">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {player.position}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {player.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        {player.gradYear}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSavePlayer(player.id)}
                    aria-label={savedPlayers.has(player.id) ? 'Unsave player' : 'Save player'}
                    aria-pressed={savedPlayers.has(player.id)}
                    className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 ${
                      savedPlayers.has(player.id)
                        ? 'text-pink-300 hover:text-pink-500'
                        : 'text-ink-muted hover:text-pink-300'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${savedPlayers.has(player.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Breakout Score</span>
                    <span className="text-lg font-semibold text-green-400">{player.breakoutScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Rating</span>
                    <div className="flex items-center gap-1">
                      {renderStars(player.stars)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">NIL Points</span>
                    <span className="text-lg font-semibold text-yellow-400">{(player.nilPoints ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    to={`/coach/player/${player.id}`}
                    className="flex items-center gap-2 text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Profile
                  </Link>
                  <div className="text-sm text-ink-muted">
                    {player.offers} offers • {player.highlights} highlights
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loadError && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-ink-muted mb-4">Search failed. Could not load players.</p>
            <Button onClick={searchPlayers}>Retry</Button>
          </div>
        )}
        {players.length === 0 && !loading && !loadError && (
          <EmptyState
            icon={<Search className="w-12 h-12" />}
            title="No players found"
            body="Try adjusting your search filters"
          />
        )}
      </div>
    </div>
  );
}