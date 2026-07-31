import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Users,
  Eye,
  Trash2,
  Star,
  MapPin,
  GraduationCap,
  Award,
  Download,
  Pencil,
  Check,
  X,
  Binoculars,
  Phone,
  Send,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import type { PlayerSearchResult } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { Button, Card, EmptyState, RowSkeleton } from '../../components/ui';
import { colors, text, type as typeToken } from '../../lib/tokens';
import { springs, staggerDelay } from '../../lib/motion';

type RosterStatus = 'watching' | 'contacted' | 'offered' | 'committed';

// Roster cards don't load game/combine numbers — those need their own join
// from /api/players/:id/stats and aren't shown on the board.
interface RosterAthlete extends Omit<PlayerSearchResult, 'stats' | 'combineStats'> {
  stats?: PlayerSearchResult['stats'];
  combineStats?: PlayerSearchResult['combineStats'];
  status: RosterStatus;
  notes: string;
}

interface PlayerApiRow {
  id: number;
  name?: string;
  position?: string;
  state?: string;
  city?: string;
  school?: string;
  gradYear?: number;
  height?: string;
  weight?: number;
  gpa?: number | string;
  g5Rating?: number;
  archetype?: string;
  verificationStatus?: string;
  collegeOffers?: unknown[];
  nilPoints?: number;
}

const STATUSES: {
  id: RosterStatus;
  label: string;
  icon: typeof Binoculars;
  fill: string;
  border: string;
  tone: string;
}[] = [
  { id: 'watching', label: 'Watching', icon: Binoculars, fill: 'rgba(255,46,147,0.1)', border: 'rgba(255,46,147,0.2)', tone: colors.pinkText },
  { id: 'contacted', label: 'Contacted', icon: Phone, fill: 'rgba(139,59,255,0.1)', border: 'rgba(139,59,255,0.2)', tone: colors.accentText },
  { id: 'offered', label: 'Offered', icon: Send, fill: 'rgba(139,59,255,0.16)', border: 'rgba(139,59,255,0.3)', tone: colors.accentHover },
  { id: 'committed', label: 'Committed', icon: CheckCircle2, fill: 'rgba(57,255,20,0.1)', border: 'rgba(57,255,20,0.25)', tone: colors.neon },
];

const statusMeta = (status: RosterStatus) => STATUSES.find((s) => s.id === status)!;

const tierToStatus = (tier: string): RosterStatus => {
  if (tier === 'offered') return 'offered';
  if (tier === 'top-target') return 'contacted';
  return 'watching';
};

const statusToTier = (status: RosterStatus): string => {
  if (status === 'offered' || status === 'committed') return 'offered';
  if (status === 'contacted') return 'top-target';
  return 'watching';
};

const displayHeading = {
  fontFamily: typeToken.font.display,
  letterSpacing: typeToken.tracking.h1,
} as const;

async function coachFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('coachToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string> | undefined) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`) as any;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

function StatusControl({
  status,
  onChange,
  full = false,
}: {
  status: RosterStatus;
  onChange: (status: RosterStatus) => void;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const meta = statusMeta(status);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${full ? 'w-full' : 'inline-block'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          full ? 'w-full rounded-[12px] px-3 py-2 text-sm' : 'rounded-full pl-3 pr-2.5 py-1.5 text-xs'
        }`}
        style={{
          minHeight: 44,
          background: meta.fill,
          borderColor: meta.border,
          color: meta.tone,
        }}
      >
        <span>{meta.label}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={springs.snappy}
            className={`absolute z-20 mt-1.5 overflow-hidden rounded-[12px] border p-1 shadow-lg ${full ? 'w-full' : 'min-w-[9rem]'}`}
            style={{ background: colors.surface2, borderColor: colors.border }}
          >
            {STATUSES.map((s) => {
              const active = s.id === status;
              return (
                <li key={s.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(s.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 min-h-[44px] text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    style={{ color: s.tone, background: active ? s.fill : 'transparent', ['--tw-ring-color' as string]: colors.accent }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1">{s.label}</span>
                    {active && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CoachRoster() {
  const [roster, setRoster] = useState<RosterAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const { showNotification } = useNotifications();
  const reduce = useReducedMotion();

  useEffect(() => {
    const load = async () => {
      try {
        const boardRes = await coachFetch<{ board: Array<{ athleteId: number; tier: string; notes: string }> }>('/api/coach/board');
        const entries = boardRes.board ?? [];

        const rows = await Promise.all(
          entries.map(async (entry) => {
            try {
              const player = await coachFetch<PlayerApiRow>(`/api/players/${entry.athleteId}`);
              return player ? { entry, player } : null;
            } catch { return null; }
          })
        );

        setRoster(
          rows
            .filter((r): r is { entry: typeof entries[0]; player: PlayerApiRow } => r !== null)
            .map(({ entry, player }) => ({
              id: player.id,
              name: player.name ?? '',
              position: player.position ?? '',
              state: player.state ?? '',
              city: player.city ?? '',
              school: player.school ?? '',
              gradYear: player.gradYear ?? 0,
              height: player.height ?? '—',
              weight: player.weight ?? 0,
              gpa: parseFloat(String(player.gpa ?? '')) || 0,
              breakoutScore: player.g5Rating ? player.g5Rating * 20 : 0,
              stars: player.g5Rating ?? 0,
              archetype: player.archetype ?? '',
              highlights: 0,
              verified: player.verificationStatus === 'verified',
              offers: Array.isArray(player.collegeOffers) ? player.collegeOffers.length : 0,
              committed: false,
              nilPoints: player.nilPoints ?? 0,
              status: tierToStatus(entry.tier),
              notes: entry.notes ?? '',
            }))
        );
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusCounts = useMemo(() => {
    return STATUSES.reduce<Record<RosterStatus, number>>((acc, s) => {
      acc[s.id] = roster.filter((a) => a.status === s.id).length;
      return acc;
    }, { watching: 0, contacted: 0, offered: 0, committed: 0 });
  }, [roster]);

  const changeStatus = (id: number, status: RosterStatus) => {
    const athlete = roster.find((a) => a.id === id);
    setRoster((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    showNotification('success', 'Status Updated', `${athlete?.name} moved to ${statusMeta(status).label}.`);
    coachFetch(`/api/coach/players/${id}/tier`, {
      method: 'PATCH',
      body: JSON.stringify({ tier: statusToTier(status) }),
    }).catch(() => {});
  };

  const removeAthlete = (id: number) => {
    const athlete = roster.find((a) => a.id === id);
    setRoster((prev) => prev.filter((a) => a.id !== id));
    if (editingNotes === id) setEditingNotes(null);
    showNotification('info', 'Removed from Roster', `${athlete?.name} was removed from your roster.`);
    coachFetch(`/api/coach/players/${id}/save`, { method: 'DELETE' }).catch(() => {});
  };

  const startEditNotes = (id: number, current: string) => {
    setEditingNotes(id);
    setNotesDraft(current);
  };

  const saveNotes = (id: number) => {
    const athlete = roster.find((a) => a.id === id);
    const notesToSave = notesDraft;
    setRoster((prev) => prev.map((a) => (a.id === id ? { ...a, notes: notesToSave } : a)));
    setEditingNotes(null);
    setNotesDraft('');
    showNotification('success', 'Notes Saved', `Notes updated for ${athlete?.name}.`);
    coachFetch(`/api/coach/players/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: notesToSave }),
    }).catch(() => {});
  };

  const exportToCSV = () => {
    if (roster.length === 0) {
      showNotification('warning', 'Nothing to Export', 'Your roster is empty.');
      return;
    }
    const headers = ['Name', 'Position', 'School', 'State', 'Grad Year', 'Breakout Score', 'Stars', 'Status', 'Notes'];
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = roster.map((a) => [
      a.name, a.position, a.school, a.state, a.gradYear, a.breakoutScore, a.stars, statusMeta(a.status).label, a.notes,
    ].map(escape).join(','));
    const csv = [headers.map(escape).join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', 'Export Complete', `Exported ${roster.length} athletes to CSV.`);
  };

  const renderStars = (stars: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className="h-4 w-4"
        style={{ color: i < stars ? colors.neon : colors.border, fill: i < stars ? 'currentColor' : 'none' }}
      />
    ));

  const rowTransition = (idx: number) =>
    reduce ? { duration: 0 } : { ...springs.gentle, delay: staggerDelay(idx) };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: colors.surface0, color: text.primary }}>
        <div style={{ background: colors.surface1, borderBottom: `1px solid ${colors.border}` }}>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold" style={{ ...displayHeading, color: text.primary }}>My Roster</h1>
            <p className="mt-2" style={{ color: text.secondary }}>Manage your shortlisted and recruited athletes</p>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="divide-y px-6" style={{ borderColor: colors.border }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderColor: colors.border }}>
                <RowSkeleton />
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4"
        style={{ height: '60vh', color: text.tertiary }}
      >
        <span style={{ fontSize: typeToken.size.md }}>Failed to load roster.</span>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: colors.surface0, color: text.primary }}>
      {/* Header */}
      <div style={{ background: colors.surface1, borderBottom: `1px solid ${colors.border}` }}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ ...displayHeading, color: text.primary }}>My Roster</h1>
              <p className="mt-2" style={{ color: text.secondary }}>Manage your shortlisted and recruited athletes</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={exportToCSV}>
                <Download className="h-5 w-5" />
                Export to CSV
              </Button>
              <Link to="/coach/search">
                <Button>Find Athletes</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium" style={{ color: text.secondary }}>Total Athletes</p>
                <p className="tnum mt-1 text-2xl font-bold" style={{ ...displayHeading, color: text.primary }}>{roster.length}</p>
              </div>
              <Users className="h-8 w-8" style={{ color: colors.accentText }} />
            </div>
          </Card>
          {STATUSES.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.id}>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm font-medium" style={{ color: text.secondary }}>{s.label}</p>
                    <p className="tnum mt-1 text-2xl font-bold" style={{ ...displayHeading, color: text.primary }}>{statusCounts[s.id]}</p>
                  </div>
                  <Icon className="h-8 w-8" style={{ color: s.tone }} />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Roster */}
        {roster.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Your roster is empty"
            body="Start building your roster by shortlisting athletes from the player search."
            cta={
              <Link to="/coach/search">
                <Button>Search Athletes</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden overflow-visible lg:block">
              <table className="w-full">
                <thead>
                  <tr
                    className="text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ borderBottom: `1px solid ${colors.border}`, color: text.secondary }}
                  >
                    <th className="px-6 py-4">Athlete</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">School</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {roster.map((athlete, idx) => (
                      <motion.tr
                        key={athlete.id}
                        layout={!reduce}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12, transition: { duration: reduce ? 0 : 0.18 } }}
                        transition={rowTransition(idx)}
                        className="align-top transition-colors last:border-0"
                        style={{ borderBottom: `1px solid ${colors.border}` }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/coach/player/${athlete.id}`}
                              className="font-semibold transition-colors hover:opacity-80"
                              style={{ color: text.primary }}
                            >
                              {athlete.name}
                            </Link>
                            {athlete.verified && <Award className="h-4 w-4 flex-shrink-0" style={{ color: colors.accentText }} />}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: text.secondary }}>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{athlete.state}</span>
                            <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{athlete.gradYear}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-block rounded px-2.5 py-1 text-xs font-semibold"
                            style={{ background: colors.surface2, color: text.secondary }}
                          >
                            {athlete.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: text.secondary }}>{athlete.school}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="tnum text-lg font-bold" style={{ color: colors.neon }}>{athlete.breakoutScore}</span>
                            <div className="flex">{renderStars(athlete.stars)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusControl status={athlete.status} onChange={(s) => changeStatus(athlete.id, s)} />
                        </td>
                        <td className="min-w-[16rem] px-6 py-4">
                          {editingNotes === athlete.id ? (
                            <div className="flex items-start gap-2">
                              <textarea
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                autoFocus
                                rows={2}
                                className="k-input flex-1 resize-none text-sm"
                                placeholder="Add notes..."
                              />
                              <div className="flex flex-col gap-1">
                                <Button size="sm" className="px-2" onClick={() => saveNotes(athlete.id)} title="Save">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="px-2" onClick={() => setEditingNotes(null)} title="Cancel">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditNotes(athlete.id, athlete.notes)}
                              className="group flex w-full items-start gap-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                              style={{ ['--tw-ring-color' as string]: colors.accent }}
                            >
                              <span style={{ color: athlete.notes ? text.secondary : text.tertiary, fontStyle: athlete.notes ? 'normal' : 'italic' }}>
                                {athlete.notes || 'Click to add notes...'}
                              </span>
                              <Pencil className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: text.tertiary }} />
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/coach/player/${athlete.id}`}
                              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                              style={{ color: text.secondary, ['--tw-ring-color' as string]: colors.accent }}
                              title="View profile"
                              aria-label="View profile"
                            >
                              <Eye className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={() => removeAthlete(athlete.id)}
                              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                              style={{ color: text.secondary, ['--tw-ring-color' as string]: colors.accent }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = colors.dangerText)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = text.secondary)}
                              title="Remove from roster"
                              aria-label="Remove from roster"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </Card>

            {/* Mobile / tablet cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
              <AnimatePresence initial={false}>
                {roster.map((athlete, idx) => (
                  <motion.div
                    key={athlete.id}
                    layout={!reduce}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: reduce ? 0 : 0.18 } }}
                    transition={rowTransition(idx)}
                  >
                    <Card className="p-5">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Link
                              to={`/coach/player/${athlete.id}`}
                              className="truncate text-lg font-semibold transition-colors hover:opacity-80"
                              style={{ color: text.primary }}
                            >
                              {athlete.name}
                            </Link>
                            {athlete.verified && <Award className="h-4 w-4 flex-shrink-0" style={{ color: colors.accentText }} />}
                          </div>
                          <div className="flex items-center gap-3 text-xs" style={{ color: text.secondary }}>
                            <span className="rounded px-2 py-0.5 font-semibold" style={{ background: colors.surface2, color: text.secondary }}>{athlete.position}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{athlete.state}</span>
                            <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{athlete.gradYear}</span>
                          </div>
                          <p className="mt-1 text-sm" style={{ color: text.secondary }}>{athlete.school}</p>
                        </div>
                        <button
                          onClick={() => removeAthlete(athlete.id)}
                          className="flex-shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                          style={{ color: text.secondary, ['--tw-ring-color' as string]: colors.accent }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = colors.dangerText)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = text.secondary)}
                          title="Remove from roster"
                          aria-label="Remove from roster"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="tnum text-xl font-bold" style={{ color: colors.neon }}>{athlete.breakoutScore}</span>
                          <div className="flex">{renderStars(athlete.stars)}</div>
                        </div>
                        <Link
                          to={`/coach/player/${athlete.id}`}
                          className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
                          style={{ color: colors.accentText }}
                        >
                          <Eye className="h-4 w-4" /> Profile
                        </Link>
                      </div>

                      <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-medium" style={{ color: text.secondary }}>Status</label>
                        <StatusControl status={athlete.status} onChange={(s) => changeStatus(athlete.id, s)} full />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium" style={{ color: text.secondary }}>Notes</label>
                        {editingNotes === athlete.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              autoFocus
                              rows={3}
                              className="k-input w-full resize-none text-sm"
                              placeholder="Add notes..."
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveNotes(athlete.id)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditNotes(athlete.id, athlete.notes)}
                            className="min-h-[2.5rem] w-full rounded border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            style={{ background: colors.surface2, borderColor: colors.border, ['--tw-ring-color' as string]: colors.accent }}
                          >
                            <span style={{ color: athlete.notes ? text.secondary : text.tertiary, fontStyle: athlete.notes ? 'normal' : 'italic' }}>
                              {athlete.notes || 'Click to add notes...'}
                            </span>
                          </button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
