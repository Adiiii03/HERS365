import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Bookmark, BookmarkCheck, X, MapPin,
  Users, Award, ChevronDown, CheckCircle2, RefreshCw,
  ClipboardList, BarChart2, GraduationCap,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { apiFetch, type ApiError } from '../lib/api';
import { FLAG_POSITIONS } from '../lib/positions';
import { colors, type as t, radii } from '../lib/tokens';
import { springs, staggerDelay } from '../lib/motion';
import { Button, Card, Badge, Stat, EmptyState, Skeleton } from '../components/ui';

interface Program {
  id: number;
  name: string;
  city: string;
  state: string;
  division: string;
  conference: string;
  hasScholarships: boolean;
  programSize: 'Small' | 'Medium' | 'Large';
  coachId: number | null;
  athletesRecruited: number;
  winRecord: string;
  tuitionInState: number;
}

interface Coach {
  id: number;
  name: string;
  title: string;
  school: string;
  sport: string;
  email: string;
  bio: string;
  recruitedAthletes: string[];
}

interface Scholarship {
  id: number;
  name: string;
  amount: number | null;
  deadline: string | null;
  requirements: string | null;
  category: string | null;
}

interface Application {
  id: number;
  programId: number;
  programName: string | null;
  programDivision: string | null;
  programState: string | null;
  position: string;
  note: string | null;
  status: string;
  createdAt: string;
}

interface Insights {
  totalViewsLast30d: number;
  uniqueCoachesLast30d: number;
  recentViews: { viewerName: string | null; viewerType: string; viewedAt: string }[];
}

const divisions     = ['All', 'NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'JUCO'];
const stateOptions  = ['All', 'California', 'Florida', 'Georgia', 'Kansas', 'Missouri', 'Texas'];
const conferences   = ['All', 'ACC', 'ASC', 'Big 12', 'GSAC', 'HAAC', 'OVC', 'PCAC', 'SAC'];
const sizes         = ['All', 'Small', 'Medium', 'Large'];
const positions     = FLAG_POSITIONS;

type StatusTone = 'accent' | 'pink' | 'success' | 'neutral';
const STATUS_TONE: Record<string, StatusTone> = {
  pending: 'neutral', reviewed: 'accent', accepted: 'success', rejected: 'pink',
};

function ProgramAvatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: radii.md, background: 'rgba(139,59,255,0.12)',
      border: `1px solid rgba(139,59,255,0.25)`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontFamily: t.font.display, fontWeight: t.weight.bold, fontSize: t.size.lg, color: colors.accent }}>
        {name.split(' ').map(w => w[0]).slice(0, 2).join('')}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card style={{ padding: '18px 18px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Skeleton width={48} height={48} radius={radii.md} />
        <div style={{ flex: 1 }}>
          <Skeleton width="65%" height={13} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={10} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Skeleton width={64} height={20} />
        <Skeleton width={52} height={20} />
      </div>
      <Skeleton width="100%" height={52} radius={radii.sm} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width="100%" height={32} radius={radii.sm} />
        <Skeleton width="100%" height={32} radius={radii.sm} />
      </div>
    </Card>
  );
}

export const Recruiting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotifications();
  const { user, isAuthenticated } = useAuth();

  const [search, setSearch]               = useState(searchParams.get('q') || '');
  const [filterDiv, setFilterDiv]         = useState(searchParams.get('division') || 'All');
  const [filterState, setFilterState]     = useState(searchParams.get('state') || 'All');
  const [filterConf, setFilterConf]       = useState(searchParams.get('conference') || 'All');
  const [filterScholarship, setFilterScholarship] = useState(searchParams.get('scholarship') || 'All');
  const [filterSize, setFilterSize]       = useState(searchParams.get('size') || 'All');
  const [showFilters, setShowFilters]     = useState(false);
  const [activeTab, setActiveTab]         = useState<'browse' | 'saved' | 'scholarships' | 'applications' | 'insights'>('browse');

  const [programs, setPrograms]   = useState<Program[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [savedSchools, setSavedSchools]       = useState<Set<number>>(new Set());
  const [appliedPrograms, setAppliedPrograms] = useState<Set<number>>(new Set());

  const [coachModal, setCoachModal] = useState<{ open: boolean; coach: Coach | null; program: Program | null }>({
    open: false, coach: null, program: null,
  });
  const [coachLoading, setCoachLoading] = useState(false);

  const [applyModal, setApplyModal] = useState<{ open: boolean; program: Program | null }>({
    open: false, program: null,
  });
  const [profile, setProfile] = useState<{ name: string; gradYear: string }>({ name: '', gradYear: '' });
  const [applyForm, setApplyForm] = useState({ position: '', note: '' });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySubmitted, setApplySubmitted]   = useState(false);

  // Coach modal compose state — setters referenced in openCoachModal
  const [_showMessageCompose, setShowMessageCompose] = useState(false);
  const [_messageText, setMessageText]               = useState('');

  // Scholarships tab
  const [scholarships, setScholarships]         = useState<Scholarship[]>([]);
  const [savedScholarshipIds, setSavedScholarshipIds] = useState<Set<number>>(new Set());
  const [scholarshipsLoading, setScholarshipsLoading] = useState(false);

  // Applications tab
  const [applications, setApplications]   = useState<Application[]>([]);
  const [appsLoading, setAppsLoading]     = useState(false);

  // Insights tab
  const [insights, setInsights]         = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [scholarshipError, setScholarshipError] = useState(false);
  const [appsError, setAppsError] = useState(false);
  const [insightsError, setInsightsError] = useState(false);
  const isMobile = useIsMobile();

  // Sync filters → URL params
  useEffect(() => {
    const p: Record<string, string> = {};
    if (search) p.q = search;
    if (filterDiv !== 'All') p.division = filterDiv;
    if (filterState !== 'All') p.state = filterState;
    if (filterConf !== 'All') p.conference = filterConf;
    if (filterScholarship !== 'All') p.scholarship = filterScholarship;
    if (filterSize !== 'All') p.size = filterSize;
    setSearchParams(p, { replace: true });
  }, [search, filterDiv, filterState, filterConf, filterScholarship, filterSize, setSearchParams]);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterDiv !== 'All') params.set('division', filterDiv);
      if (filterState !== 'All') params.set('state', filterState);
      if (filterConf !== 'All') params.set('conference', filterConf);
      if (filterScholarship !== 'All') params.set('scholarship', filterScholarship);
      if (filterSize !== 'All') params.set('size', filterSize);
      const qs = params.toString();
      const res = await apiFetch<{ data: Program[] }>(`/api/programs${qs ? `?${qs}` : ''}`);
      setPrograms(res.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [search, filterDiv, filterState, filterConf, filterScholarship, filterSize]);

  // Debounced fetch on search/filter changes
  useEffect(() => {
    const t = setTimeout(fetchPrograms, 250);
    return () => clearTimeout(t);
  }, [fetchPrograms]);

  // Hydrate saved schools + applications + profile once authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    apiFetch<{ data: number[] }>('/api/athletes/me/saved-schools')
      .then(res => setSavedSchools(new Set(res.data)))
      .catch(() => {});
    apiFetch<{ data: { programId: number }[] }>('/api/programs/me/applications')
      .then(res => setAppliedPrograms(new Set(res.data.map(a => a.programId))))
      .catch(() => {});
    apiFetch<{ data: { name?: string; gradYear?: number; position?: string } }>(`/api/athletes/${user.id}`)
      .then(res => {
        setProfile({ name: res.data.name || user.name, gradYear: res.data.gradYear ? String(res.data.gradYear) : '' });
        if (res.data.position && positions.includes(res.data.position)) {
          setApplyForm(f => (f.position ? f : { ...f, position: res.data.position! }));
        }
      })
      .catch(() => setProfile({ name: user.name, gradYear: '' }));
  }, [isAuthenticated, user]);

  // Fetch scholarships when that tab is active
  useEffect(() => {
    if (activeTab !== 'scholarships') return;
    setScholarshipsLoading(true);
    Promise.all([
      apiFetch<{ data: Scholarship[] }>('/api/scholarships').then(r => setScholarships(r.data)),
      isAuthenticated
        ? apiFetch<{ data: Scholarship[] }>('/api/scholarships/saved').then(r => setSavedScholarshipIds(new Set(r.data.map(s => s.id))))
        : Promise.resolve(),
    ]).catch(() => { setScholarshipError(true); }).finally(() => setScholarshipsLoading(false));
  }, [activeTab, isAuthenticated]);

  // Fetch applications when that tab is active
  useEffect(() => {
    if (activeTab !== 'applications' || !isAuthenticated) return;
    setAppsLoading(true);
    apiFetch<{ data: Application[] }>('/api/programs/me/applications')
      .then(r => setApplications(r.data))
      .catch(() => { setAppsError(true); })
      .finally(() => setAppsLoading(false));
  }, [activeTab, isAuthenticated]);

  // Fetch insights when that tab is active
  useEffect(() => {
    if (activeTab !== 'insights' || !isAuthenticated) return;
    setInsightsLoading(true);
    apiFetch<{ data: Insights }>('/api/athletes/me/insights')
      .then(r => setInsights(r.data))
      .catch(() => { setInsightsError(true); })
      .finally(() => setInsightsLoading(false));
  }, [activeTab, isAuthenticated]);

  const toggleSaveScholarship = async (id: number) => {
    if (!isAuthenticated) { showNotification('error', 'Sign In Required', 'Log in to save scholarships'); return; }
    const isSaved = savedScholarshipIds.has(id);
    setSavedScholarshipIds(prev => { const n = new Set(prev); if (isSaved) n.delete(id); else n.add(id); return n; });
    try {
      if (isSaved) {
        await apiFetch(`/api/scholarships/${id}/save`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/scholarships/${id}/save`, { method: 'POST' });
      }
    } catch {
      setSavedScholarshipIds(prev => { const n = new Set(prev); if (isSaved) n.add(id); else n.delete(id); return n; });
    }
  };

  const deadlineIn = useMemo(() => (deadline: string | null) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    return `${days}d`;
  }, []);

  const savedPrograms   = programs.filter(p => savedSchools.has(p.id));
  const displayPrograms = activeTab === 'browse' ? programs : savedPrograms;

  const toggleSave = async (programId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      showNotification('error', 'Sign In Required', 'Log in to save schools to your list');
      return;
    }
    const isSaved = savedSchools.has(programId);
    setSavedSchools(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(programId); else next.add(programId);
      return next;
    });
    try {
      if (isSaved) {
        await apiFetch(`/api/athletes/me/saved-schools/${programId}`, { method: 'DELETE' });
      } else {
        await apiFetch('/api/athletes/me/saved-schools', {
          method: 'POST',
          body: JSON.stringify({ schoolId: programId }),
        });
      }
      showNotification('success', isSaved ? 'Removed' : 'Saved', isSaved ? 'School removed from your list' : 'School saved to your list');
    } catch {
      // Revert the optimistic update
      setSavedSchools(prev => {
        const next = new Set(prev);
        if (isSaved) next.add(programId); else next.delete(programId);
        return next;
      });
      showNotification('error', 'Something Went Wrong', 'Could not update your saved schools. Please try again.');
    }
  };

  const openCoachModal = async (program: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setCoachModal({ open: true, coach: null, program });
    setShowMessageCompose(false);
    setMessageText('');
    if (program.coachId) {
      setCoachLoading(true);
      try {
        const res = await apiFetch<{ data: Coach }>(`/api/coaches/${program.coachId}`);
        setCoachModal(m => (m.open ? { ...m, coach: res.data } : m));
      } catch {
        showNotification('error', 'Could Not Load Coach', 'Please try again in a moment.');
      } finally {
        setCoachLoading(false);
      }
    }
  };

  const closeCoachModal = () => {
    setCoachModal({ open: false, coach: null, program: null });
  };

  const openApplyModal = (program: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      showNotification('error', 'Sign In Required', 'Log in to express interest in programs');
      return;
    }
    setApplyModal({ open: true, program });
    setApplySubmitted(false);
    setApplyForm(f => ({ ...f, note: '' }));
  };

  const closeApplyModal = () => {
    setApplyModal({ open: false, program: null });
    setApplySubmitted(false);
  };

  const submitApplication = async () => {
    if (!applyModal.program || !applyForm.position) return;
    setApplySubmitting(true);
    try {
      await apiFetch(`/api/programs/${applyModal.program.id}/applications`, {
        method: 'POST',
        body: JSON.stringify({ position: applyForm.position, note: applyForm.note }),
      });
      setAppliedPrograms(prev => new Set(prev).add(applyModal.program!.id));
      setApplySubmitted(true);
      showNotification('success', 'Interest Submitted!', `Your application to ${applyModal.program.name} has been sent`);
    } catch (err) {
      if ((err as ApiError).status === 409) {
        setAppliedPrograms(prev => new Set(prev).add(applyModal.program!.id));
        setApplySubmitted(true);
        showNotification('success', 'Already Applied', `You have already expressed interest in ${applyModal.program.name}`);
      } else {
        showNotification('error', 'Submission Failed', 'Could not submit your application. Please try again.');
      }
    } finally {
      setApplySubmitting(false);
    }
  };

  const sel: React.CSSProperties = {
    background: colors.surface1, border: `1px solid ${colors.border}`,
    borderRadius: radii.sm, padding: '8px 12px', color: colors.textSecondary,
    fontSize: t.size.base, outline: 'none', cursor: 'pointer', width: '100%',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  };

  const modalStyle: React.CSSProperties = {
    background: colors.surface1, border: `1px solid ${colors.border}`,
    borderRadius: radii.lg, padding: 28, width: '90%', maxWidth: 520,
    maxHeight: '88vh', overflowY: 'auto', position: 'relative',
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block', fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6,
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: t.font.display, fontWeight: t.weight.bold, fontSize: t.size['3xl'], textTransform: 'uppercase', color: colors.textPrimary, marginBottom: 4 }}>
          College Recruiting
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.base }}>Explore flag football programs, connect with coaches, and apply to schools</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
        {([
          { key: 'browse',        label: 'Programs',         icon: <GraduationCap size={12} /> },
          { key: 'saved',         label: `Saved${savedSchools.size > 0 ? ` (${savedSchools.size})` : ''}`, icon: <Bookmark size={12} /> },
          { key: 'scholarships',  label: 'Scholarships',     icon: <Award size={12} /> },
          { key: 'applications',  label: 'My Applications',  icon: <ClipboardList size={12} /> },
          { key: 'insights',      label: 'Insights',         icon: <BarChart2 size={12} /> },
        ] as const).map(({ key, label, icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 14px', fontSize: t.size.sm, fontWeight: t.weight.bold,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 5,
            color: activeTab === key ? colors.accent : colors.textTertiary,
            borderBottom: activeTab === key ? `2px solid ${colors.accent}` : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Search + Filters — only shown for browse/saved tabs */}
      {(activeTab === 'browse' || activeTab === 'saved') && (
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textTertiary, pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Search programs, schools, conferences..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '10px 12px 10px 36px', color: colors.textPrimary, fontSize: t.size.base, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: showFilters ? colors.accent : colors.surface1,
              border: `1px solid ${colors.border}`, borderRadius: radii.sm,
              padding: '10px 16px', color: showFilters ? colors.accentOn : colors.textSecondary,
              fontSize: t.size.base, fontWeight: t.weight.semibold, cursor: 'pointer',
            }}>
              <Filter size={14} /> Filters
              <ChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.08em', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 5 }}>State</div>
                      <select value={filterState} onChange={e => setFilterState(e.target.value)} style={sel}>
                        {stateOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.08em', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 5 }}>Division</div>
                      <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} style={sel}>
                        {divisions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Divisions' : d}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.08em', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 5 }}>Conference</div>
                      <select value={filterConf} onChange={e => setFilterConf(e.target.value)} style={sel}>
                        {conferences.map(c => <option key={c} value={c}>{c === 'All' ? 'All Conferences' : c}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.08em', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 5 }}>Scholarships</div>
                      <select value={filterScholarship} onChange={e => setFilterScholarship(e.target.value)} style={sel}>
                        <option value="All">Any</option>
                        <option value="Yes">Available</option>
                        <option value="No">Not Available</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.08em', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 5 }}>Program Size</div>
                      <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={sel}>
                        {sizes.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sizes' : s}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button onClick={() => { setFilterDiv('All'); setFilterState('All'); setFilterConf('All'); setFilterScholarship('All'); setFilterSize('All'); setSearch(''); }}
                        style={{ ...sel, width: '100%', color: colors.textTertiary, textAlign: 'center', letterSpacing: '0.04em' }}>
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Results meta — only for program tabs */}
      {(activeTab === 'browse' || activeTab === 'saved') && (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: t.size.sm, color: colors.textTertiary }}>
          {loading ? 'Loading programs...' : (
            <>Showing <span style={{ color: colors.textSecondary, fontWeight: t.weight.semibold }}>{displayPrograms.length}</span>{' '}
            {activeTab === 'browse' ? 'programs' : 'saved schools'}</>
          )}
        </span>
        {activeTab === 'browse' && (
          <span style={{ fontSize: t.size.sm, color: colors.textTertiary }}>
            {savedSchools.size} saved · {appliedPrograms.size} applied
          </span>
        )}
      </div>
      )}

      {/* Program list — only for browse/saved tabs */}
      {(activeTab === 'browse' || activeTab === 'saved') && (<>

      {/* Load error */}
      {loadError && !loading && (
        <EmptyState
          title="Could not load programs"
          body="Check your connection and try again"
          cta={
            <Button variant="ghost" size="sm" onClick={fetchPrograms}>
              <RefreshCw size={13} /> Retry
            </Button>
          }
        />
      )}

      {/* Program Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {loading && !loadError && Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
        {!loading && !loadError && displayPrograms.map((program, i) => {
          const isSaved   = savedSchools.has(program.id);
          const isApplied = appliedPrograms.has(program.id);

          return (
            <motion.div key={program.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: staggerDelay(i, 0.04) }}>
            <Card hover style={{ padding: '18px 18px 14px', position: 'relative' }}>

              {/* Save button */}
              <button onClick={e => toggleSave(program.id, e)} style={{
                position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
                cursor: 'pointer', color: isSaved ? colors.accent : colors.textTertiary, padding: 4, transition: 'color 0.15s',
              }}>
                {isSaved
                  ? <BookmarkCheck size={16} fill={colors.accent} />
                  : <Bookmark size={16} />}
              </button>

              {/* School header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <ProgramAvatar name={program.name} />
                <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
                  <div style={{ fontSize: t.size.md, fontWeight: t.weight.bold, color: colors.textPrimary, lineHeight: 1.2 }}>{program.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <MapPin size={11} color={colors.textTertiary} />
                    <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{program.city}, {program.state}</span>
                  </div>
                </div>
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <Badge tone="accent">{program.division}</Badge>
                <Badge tone="neutral">{program.conference}</Badge>
                {program.hasScholarships && (
                  <Badge tone="accent"><Award size={10} style={{ marginRight: 3 }} /> Scholarship</Badge>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', background: colors.surface0, borderRadius: radii.sm, overflow: 'hidden', marginBottom: 12, border: `1px solid ${colors.border}` }}>
                {[
                  { label: 'Record', value: program.winRecord },
                  { label: 'Roster', value: `${program.athletesRecruited}` },
                  { label: 'Size', value: program.programSize },
                ].map(({ label, value }, idx, arr) => (
                  <div key={label} style={{ flex: 1, padding: '9px 6px', textAlign: 'center', borderRight: idx < arr.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: t.size.base, fontWeight: t.weight.bold, color: colors.textSecondary }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" className="flex-1" onClick={e => openCoachModal(program, e)}>
                  View Coach
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isApplied}
                  onClick={e => isApplied ? undefined : openApplyModal(program, e)}>
                  {isApplied ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> Applied
                    </span>
                  ) : 'Apply'}
                </Button>
              </div>
            </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {!loading && !loadError && displayPrograms.length === 0 && (
        <EmptyState
          title={activeTab === 'saved' ? 'No saved schools yet' : 'No programs found'}
          body={activeTab === 'saved' ? 'Bookmark programs to save them here' : 'Try adjusting your filters'}
        />
      )}

      </>)}

      {/* ── Scholarships Tab ────────────────────────────────────── */}
      {activeTab === 'scholarships' && (
        <div>
          {scholarshipsLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
              {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
            </div>
          )}
          {scholarshipError && !scholarshipsLoading && (
            <EmptyState
              title="Could not load scholarships"
              body="Check your connection and try again."
              cta={<Button variant="ghost" size="sm" onClick={() => { setScholarshipError(false); setActiveTab('scholarships'); }}><RefreshCw size={13} /> Retry</Button>}
            />
          )}
          {!scholarshipsLoading && !scholarshipError && scholarships.length === 0 && (
            <EmptyState
              icon={<Award size={36} style={{ opacity: 0.3 }} />}
              title="No scholarships yet"
              body="Check back soon — the admin team adds new scholarships regularly."
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scholarships.map(s => {
              const isSaved = savedScholarshipIds.has(s.id);
              const daysLeft = deadlineIn(s.deadline);
              return (
                <Card key={s.id} style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: t.size.md, fontWeight: t.weight.bold, color: colors.textPrimary }}>{s.name}</div>
                      {s.category && <Badge tone="accent">{s.category}</Badge>}
                    </div>
                    {s.amount && <div style={{ fontSize: t.size.lg, fontWeight: t.weight.bold, color: colors.accent, marginBottom: 4 }}>${s.amount.toLocaleString()}</div>}
                    {s.requirements && <div style={{ fontSize: t.size.sm, color: colors.textSecondary, lineHeight: 1.5 }}>{s.requirements}</div>}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {daysLeft && (
                      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, color: daysLeft === 'Expired' ? colors.pinkText : daysLeft === 'Today' ? colors.accentText : colors.textSecondary, marginBottom: 8 }}>
                        {daysLeft === 'Expired' ? 'Expired' : daysLeft === 'Today' ? 'Due today' : `${daysLeft} left`}
                      </div>
                    )}
                    <button onClick={() => toggleSaveScholarship(s.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: isSaved ? colors.accent : colors.textTertiary, padding: 4,
                    }}>
                      {isSaved ? <BookmarkCheck size={18} fill={colors.accent} /> : <Bookmark size={18} />}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── My Applications Tab ─────────────────────────────────── */}
      {activeTab === 'applications' && (
        <div>
          {!isAuthenticated && (
            <EmptyState
              icon={<ClipboardList size={36} style={{ opacity: 0.3 }} />}
              title="Sign in to view applications"
            />
          )}
          {isAuthenticated && appsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map(i => (
                <Card key={i} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Skeleton width={48} height={48} radius={radii.md} />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="70%" height={14} style={{ marginBottom: 8 }} />
                    <Skeleton width="45%" height={10} />
                  </div>
                </Card>
              ))}
            </div>
          )}
          {appsError && !appsLoading && (
            <EmptyState
              title="Could not load applications"
              body="Check your connection and try again."
              cta={<Button variant="ghost" size="sm" onClick={() => { setAppsError(false); setActiveTab('applications'); }}><RefreshCw size={13} /> Retry</Button>}
            />
          )}
          {isAuthenticated && !appsLoading && !appsError && applications.length === 0 && (
            <EmptyState
              icon={<ClipboardList size={36} style={{ opacity: 0.3 }} />}
              title="No applications yet"
              body="Express interest in a program from the Programs tab."
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {applications.map(app => (
              <Card key={app.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: t.size.md, fontWeight: t.weight.bold, color: colors.textPrimary }}>{app.programName ?? `Program #${app.programId}`}</div>
                  <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginTop: 2 }}>
                    {[app.programDivision, app.programState].filter(Boolean).join(' · ')} · {app.position}
                  </div>
                  {app.note && <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginTop: 4, fontStyle: 'italic' }}>"{app.note}"</div>}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <Badge tone={STATUS_TONE[app.status] ?? 'neutral'} className="uppercase tracking-[0.06em]">
                    {app.status}
                  </Badge>
                  <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginTop: 4 }}>{new Date(app.createdAt).toLocaleDateString()}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Insights Tab ────────────────────────────────────────── */}
      {activeTab === 'insights' && (
        <div>
          {!isAuthenticated && (
            <EmptyState
              icon={<BarChart2 size={36} style={{ opacity: 0.3 }} />}
              title="Sign in to view your insights"
            />
          )}
          {isAuthenticated && insightsLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              {[0, 1].map(i => (
                <Card key={i} style={{ padding: '20px 18px' }}>
                  <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height={24} />
                </Card>
              ))}
            </div>
          )}
          {insightsError && !insightsLoading && (
            <EmptyState
              title="Could not load insights"
              body="Check your connection and try again."
              cta={<Button variant="ghost" size="sm" onClick={() => { setInsightsError(false); setActiveTab('insights'); }}><RefreshCw size={13} /> Retry</Button>}
            />
          )}
          {isAuthenticated && !insightsLoading && !insightsError && insights && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Profile Views (30d)', value: insights.totalViewsLast30d },
                  { label: 'Unique Coaches (30d)', value: insights.uniqueCoachesLast30d },
                ].map(({ label, value }) => (
                  <Card key={label} style={{ padding: '20px 18px' }}>
                    <Stat label={label} value={value} />
                  </Card>
                ))}
              </div>
              {insights.recentViews.length > 0 && (
                <div>
                  <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Recent Activity</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {insights.recentViews.map((v, i) => (
                      <Card key={i} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: t.size.base, color: colors.textSecondary, fontWeight: t.weight.semibold }}>{v.viewerName ?? 'A coach'} viewed your profile</div>
                        <div style={{ fontSize: t.size.xs, color: colors.textTertiary }}>{new Date(v.viewedAt).toLocaleDateString()}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {insights.recentViews.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: colors.textTertiary, fontSize: t.size.base }}>
                  No coach views yet. Keep building your profile to get noticed.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Coach Profile Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {coachModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={overlayStyle} onClick={closeCoachModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={springs.snappy}
              style={modalStyle} onClick={e => e.stopPropagation()}>

              {/* Close */}
              <button onClick={closeCoachModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: colors.textTertiary, padding: 4 }}>
                <X size={18} />
              </button>

              {coachLoading ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <Skeleton width={56} height={56} radius={9999} style={{ margin: '0 auto 16px' }} />
                  <Skeleton width={160} height={14} style={{ margin: '0 auto 8px' }} />
                  <Skeleton width={100} height={10} style={{ margin: '0 auto' }} />
                </div>
              ) : coachModal.coach ? (
                <>
                  {/* Coach header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(coachModal.coach.name)}`}
                      alt={coachModal.coach.name}
                      style={{ width: 56, height: 56, borderRadius: '50%', background: colors.surface2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: t.size.md, fontWeight: t.weight.bold, color: colors.textPrimary }}>{coachModal.coach.name}</div>
                      <div style={{ fontSize: t.size.sm, color: colors.accent, fontWeight: t.weight.semibold, marginTop: 2 }}>{coachModal.coach.title}</div>
                      <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginTop: 2 }}>{coachModal.coach.school} · {coachModal.coach.sport}</div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6 }}>About</div>
                    <p style={{ fontSize: t.size.base, color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>{coachModal.coach.bio}</p>
                  </div>

                  {/* Recruited athletes */}
                  {coachModal.coach.recruitedAthletes.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 8 }}>Recent Recruits</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {coachModal.coach.recruitedAthletes.map((a, i) => (
                          <span key={i} className="k-tag" style={{ background: 'rgba(255,255,255,0.05)', color: colors.textSecondary, padding: '4px 10px', borderRadius: radii.full }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modal actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {coachModal.program && (
                      <Button
                        className="flex-1"
                        disabled={appliedPrograms.has(coachModal.program.id)}
                        onClick={e => { const prog = coachModal.program!; closeCoachModal(); openApplyModal(prog, e); }}>
                        {appliedPrograms.has(coachModal.program.id)
                          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><CheckCircle2 size={12} /> Applied</span>
                          : 'Apply Now'}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                /* No coach assigned */
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: colors.surface2, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Users size={22} color={colors.textTertiary} />
                  </div>
                  <div style={{ fontFamily: t.font.display, fontSize: t.size.lg, fontWeight: t.weight.bold, color: colors.textSecondary, marginBottom: 6 }}>No Coach Assigned</div>
                  <p style={{ fontSize: t.size.base, color: colors.textTertiary, margin: 0 }}>This program has not yet listed a coach. Check back later or apply directly.</p>
                  {coachModal.program && (
                    <Button
                      className="mt-5"
                      onClick={e => { const prog = coachModal.program!; closeCoachModal(); openApplyModal(prog, e); }}>
                      Apply Anyway
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Apply / Express Interest Modal ─────────────────────── */}
      <AnimatePresence>
        {applyModal.open && applyModal.program && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={overlayStyle} onClick={closeApplyModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={springs.snappy}
              style={modalStyle} onClick={e => e.stopPropagation()}>

              <button onClick={closeApplyModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: colors.textTertiary, padding: 4 }}>
                <X size={18} />
              </button>

              {applySubmitted ? (
                /* Success state */
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(139,59,255,0.12)', border: `1px solid rgba(139,59,255,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={26} color={colors.accent} />
                  </div>
                  <div style={{ fontFamily: t.font.display, fontSize: t.size.xl, fontWeight: t.weight.bold, color: colors.textPrimary, marginBottom: 6, textTransform: 'uppercase' }}>Interest Submitted!</div>
                  <p style={{ fontSize: t.size.base, color: colors.textSecondary, margin: '0 0 24px', lineHeight: 1.5 }}>
                    Your application to <span style={{ color: colors.textPrimary, fontWeight: t.weight.semibold }}>{applyModal.program.name}</span> has been received. The coaching staff will be in touch.
                  </p>
                  <Button onClick={closeApplyModal}>Done</Button>
                </div>
              ) : (
                /* Form — identity comes from the athlete's profile, not free text */
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.accent, marginBottom: 4 }}>Express Interest</div>
                    <div style={{ fontSize: t.size.md, fontWeight: t.weight.bold, color: colors.textPrimary }}>{applyModal.program.name}</div>
                    <div style={{ fontSize: t.size.xs, color: colors.textTertiary, marginTop: 2 }}>{applyModal.program.division} · {applyModal.program.conference}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={fieldLabel}>Applying As</label>
                        <div style={{ background: colors.surface0, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '10px 12px', color: colors.textSecondary, fontSize: t.size.base }}>
                          {profile.name || user?.name}
                        </div>
                      </div>
                      <div>
                        <label style={fieldLabel}>Grad Year</label>
                        <div style={{ background: colors.surface0, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '10px 12px', color: profile.gradYear ? colors.textSecondary : colors.textTertiary, fontSize: t.size.base }}>
                          {profile.gradYear || 'Not set on profile'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={fieldLabel}>Position <span style={{ color: colors.accent }}>*</span></label>
                      <select value={applyForm.position} onChange={e => setApplyForm(f => ({ ...f, position: e.target.value }))}
                        style={{ ...sel, width: '100%', padding: '10px 12px', color: applyForm.position ? colors.textPrimary : colors.textTertiary }}>
                        <option value="">Select...</option>
                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={fieldLabel}>Note to Coach <span style={{ color: colors.textTertiary, fontWeight: t.weight.regular, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                      <textarea
                        value={applyForm.note}
                        onChange={e => setApplyForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Tell the coach why you're interested in their program..."
                        rows={3}
                        style={{ width: '100%', background: colors.surface0, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: '10px 12px', color: colors.textPrimary, fontSize: t.size.base, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <Button variant="ghost" onClick={closeApplyModal}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      loading={applySubmitting}
                      disabled={applySubmitting || !applyForm.position}
                      onClick={submitApplication}>
                      {applySubmitting ? 'Submitting...' : 'Submit Interest'}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
