import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, Heart, MessageSquare, Award, Star, Users, MapPin, GraduationCap, Ruler, Weight, Target } from 'lucide-react';
import type { PlayerProfile } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../../components/ui';

export function CoachPlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaved, setIsSaved] = useState(false);
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (id) {
      fetchPlayerProfile(Number(id));
    }
  }, [id]);

  const fetchPlayerProfile = async (playerId: number) => {
    try {
      const token = localStorage.getItem('coachToken');
      const response = await fetch(`/api/coach/players/${playerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlayer(data);
      }
    } catch {
      showNotification('error', 'Load Failed', 'Could not load player profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSavePlayer = async () => {
    if (!player) return;

    try {
      const token = localStorage.getItem('coachToken');
      if (isSaved) {
        await fetch(`/api/coach/players/${player.id}/save`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setIsSaved(false);
      } else {
        await fetch(`/api/coach/players/${player.id}/save`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tier: 'watching' }),
        });
        setIsSaved(true);
      }
    } catch {
      showNotification('error', 'Save Failed', 'Could not update player. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!player) return;

    const message = `Hi ${player.name}, I'm interested in recruiting you for our program. I'd love to discuss your future and how you might fit with our team.`;

    try {
      const token = localStorage.getItem('coachToken');
      await fetch(`/api/coach/contact/${player.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      showNotification('success', 'Request Sent', 'Your contact request has been sent. A parent must approve before messaging begins.');
    } catch {
      showNotification('error', 'Send Failed', 'Could not send contact request. Please try again.');
    }
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < stars ? 'text-yellow-400 fill-current' : 'text-ink-faint'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display uppercase tracking-tight text-2xl font-bold text-ink mb-4">Player Not Found</h1>
          <Link to="/coach/search" className="text-accent-400 hover:text-accent-300">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'stats', label: 'Stats', icon: Target },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'highlights', label: 'Highlights', icon: Award },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/coach/search"
              className="text-ink-muted hover:text-ink transition-colors"
            >
              ← Back to Search
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Player Header */}
        <div className="bg-surface-card border border-surface-border rounded-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-surface-hover rounded-full flex items-center justify-center">
                <Users className="w-12 h-12 text-ink-muted" />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display uppercase tracking-tight text-3xl font-bold text-ink">{player.name}</h1>
                  {player.verified && (
                    <Award className="w-6 h-6 text-accent-400" />
                  )}
                </div>

                <div className="flex items-center gap-6 text-ink-muted mb-3">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {player.position}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {player.city}, {player.state}
                  </span>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {player.school} • Class of {player.gradYear}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {renderStars(player.stars)}
                  </div>
                  <span className="text-green-400 font-semibold">Breakout Score: {player.breakoutScore}</span>
                  <span className="text-yellow-400 font-semibold">NIL Points: {player.nilPoints.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant={isSaved ? 'danger' : 'ghost'}
                onClick={toggleSavePlayer}
                className="gap-2"
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save Player'}
              </Button>

              <Button onClick={sendMessage} className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Contact Player
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-500 text-white'
                  : 'bg-surface-card text-ink-muted hover:bg-surface-hover'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-surface-card border border-surface-border rounded-lg p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink mb-4">Quick Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">{player.breakoutScore}</div>
                    <div className="text-ink-muted">Breakout Score</div>
                  </div>
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">{player.nilPoints.toLocaleString()}</div>
                    <div className="text-ink-muted">NIL Points</div>
                  </div>
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="text-2xl font-bold text-accent-400 mb-1">{player.offers.length}</div>
                    <div className="text-ink-muted">Offers Received</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink mb-4">Physical Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="w-5 h-5 text-ink-muted" />
                      <span className="text-ink-muted">Height</span>
                    </div>
                    <div className="text-xl font-semibold text-ink">{player.height}</div>
                  </div>
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Weight className="w-5 h-5 text-ink-muted" />
                      <span className="text-ink-muted">Weight</span>
                    </div>
                    <div className="text-xl font-semibold text-ink">{player.weight} lbs</div>
                  </div>
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-ink-muted" />
                      <span className="text-ink-muted">Archetype</span>
                    </div>
                    <div className="text-xl font-semibold text-ink">{player.archetype}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink mb-4">College Offers</h3>
                {player.offers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {player.offers.map((offer, index) => (
                      <span key={index} className="bg-accent-500 text-white px-3 py-1 rounded-full text-sm">
                        {offer}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-muted">No offers yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink mb-6">Season Statistics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="pb-3 text-ink-muted font-medium">Category</th>
                      <th className="pb-3 text-ink-muted font-medium">Stat</th>
                      <th className="pb-3 text-ink-muted font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {player.stats && Object.entries(player.stats).map(([key, value]) => (
                      <tr key={key} className="py-3">
                        <td className="py-3 text-ink capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                        <td className="py-3 text-ink-muted">{key}</td>
                        <td className="py-3 text-ink font-semibold">{value || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'measurements' && (
            <div>
              <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink mb-6">Combine Measurements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {player.combineStats && Object.entries(player.combineStats).map(([key, value]) => (
                  <div key={key} className="bg-surface-hover rounded-lg p-4">
                    <div className="text-ink-muted mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                    <div className="text-xl font-semibold text-ink">{value || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'highlights' && (
            <div>
              <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink mb-6">Highlight Videos</h3>
              {player.highlights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {player.highlights.map((highlight, index) => (
                    <div key={index} className="bg-surface-hover rounded-lg overflow-hidden">
                      <div className="aspect-video bg-surface flex items-center justify-center">
                        <div className="text-center text-ink">
                          <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Video Preview</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="text-ink font-medium mb-2">{highlight.title}</h4>
                        <p className="text-ink-muted text-sm">
                          {highlight.locked ? 'Premium Content - Contact Required' : 'Available to Coaches'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted">No highlights available</p>
              )}
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display uppercase tracking-tight text-xl font-semibold text-ink mb-4">Academic Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="text-ink-muted mb-1">GPA</div>
                    <div className="text-2xl font-semibold text-ink">{player.academicProfile.gpa}</div>
                  </div>
                  <div className="bg-surface-hover rounded-lg p-4">
                    <div className="text-ink-muted mb-1">Intended Major</div>
                    <div className="text-xl font-semibold text-ink">{player.academicProfile.major}</div>
                  </div>
                  {player.academicProfile.act && (
                    <div className="bg-surface-hover rounded-lg p-4">
                      <div className="text-ink-muted mb-1">ACT Score</div>
                      <div className="text-2xl font-semibold text-ink">{player.academicProfile.act}</div>
                    </div>
                  )}
                  {player.academicProfile.sat && (
                    <div className="bg-surface-hover rounded-lg p-4">
                      <div className="text-ink-muted mb-1">SAT Score</div>
                      <div className="text-2xl font-semibold text-ink">{player.academicProfile.sat}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}