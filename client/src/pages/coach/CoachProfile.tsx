import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, School, Award, Shield, Save, ArrowLeft, BadgeCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../../components/ui';

interface CoachProfile {
  id: number;
  email: string;
  name: string;
  university?: string;
  division?: string;
  recruitingPositions?: string[];
  recruitingStates?: string[];
  verifiedStatus?: boolean;
}

// Real recruiter counts for the hero stat strip, pulled from GET /api/coach/analytics.
// These are genuine per-coach DB counts (board size, pipeline, messaging), not fabricated.
interface CoachStats {
  onBoard: number;
  contacted: number;
  offersOut: number;
  messagesSent: number;
}

export function CoachProfile() {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [form, setForm] = useState({
    name: '',
    university: '',
    division: '',
    recruitingPositions: '',
    recruitingStates: '',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  // Read-only: hydrate the stat strip from real analytics. Failure here must not
  // block the profile form, so we just hide the strip if it errors.
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('coachToken');
      const res = await fetch('/api/coach/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('stats unavailable');
      const data = await res.json();
      setStats({
        onBoard: Number(data?.boardCount ?? 0),
        contacted: Number(data?.playersContacted ?? 0),
        offersOut: Number(data?.recruitingPipeline?.offered ?? 0),
        messagesSent: Number(data?.messagesSent ?? 0),
      });
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('coachToken');
      const res = await fetch('/api/coach/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to load profile');
      }
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || '',
        university: data.university || '',
        division: data.division || '',
        recruitingPositions: (data.recruitingPositions || []).join(', '),
        recruitingStates: (data.recruitingStates || []).join(', '),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveStatus('saving');
    setError(null);
    try {
      const token = localStorage.getItem('coachToken');
      const body: Record<string, any> = { name: form.name };
      if (form.university) body.university = form.university;
      if (form.division) body.division = form.division;
      if (form.recruitingPositions.trim()) {
        body.recruitingPositions = form.recruitingPositions.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (form.recruitingStates.trim()) {
        body.recruitingStates = form.recruitingStates.split(',').map((s) => s.trim()).filter(Boolean);
      }

      const res = await fetch('/api/coach/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to save profile');
      }

      const updated = await res.json();
      setProfile(updated);
      setSaveStatus('saved');
      showNotification('success', 'Profile Saved', 'Your coach profile has been updated.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-red-400 font-bold">{error}</p>
        <Button onClick={fetchProfile}>Retry</Button>
      </div>
    );
  }

  const initials = (profile?.name || 'Coach')
    .split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const titleLine = [profile?.university, profile?.division].filter(Boolean).join(' • ');

  const statTiles = [
    { label: 'On Board', value: stats?.onBoard },
    { label: 'Contacted', value: stats?.contacted },
    { label: 'Offers Out', value: stats?.offersOut },
    { label: 'Messages Sent', value: stats?.messagesSent },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/coach')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-white transition-colors"
      >
        <ArrowLeft size={18} /> Back to dashboard
      </button>

      {/* Hero band */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-[#141418] border border-accent-500/30 rounded-2xl p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-500/40 to-accent-700/50 border border-accent-500/40 flex items-center justify-center shrink-0">
            <span className="font-display text-2xl font-black text-accent-200 tracking-wide">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl font-black text-white uppercase tracking-tight truncate">
                {profile?.name || 'Coach'}
              </h1>
              {profile?.verifiedStatus && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-accent-200 bg-accent-500/15 border border-accent-500/40 rounded-full px-2 py-0.5">
                  <BadgeCheck size={12} /> Verified
                </span>
              )}
            </div>
            <p className="text-sm text-ink-muted mt-1 truncate">
              {titleLine || 'Add your program below'}
            </p>
          </div>
        </div>

        {/* Stat strip — real recruiter counts from /coach/analytics */}
        {(statsLoading || stats) && (
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {statTiles.map((tile) => (
              <div
                key={tile.label}
                className="bg-white/[0.04] border border-accent-500/30 rounded-xl px-4 py-3"
              >
                {statsLoading ? (
                  <div className="h-8 w-10 bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="font-display text-3xl font-black text-accent-400 leading-none">{tile.value ?? 0}</p>
                )}
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mt-2">{tile.label}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-card border border-accent-500/30 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="font-display text-xl font-black uppercase tracking-wide text-white">Account Information</h2>
          <div className="h-0.5 w-[72px] bg-accent-500 rounded mt-2" />
          <p className="text-xs text-ink-muted mt-2">Your coach profile details.</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-ink-muted mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-ink-muted mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type="email"
                value={profile?.email || ''}
                readOnly
                className="w-full bg-surface/30 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-ink-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-ink-muted mb-2">School / Organization</label>
            <div className="relative">
              <School className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type="text"
                value={form.university}
                onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-accent-500"
                placeholder="e.g. University of Example"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-ink-muted mb-2">Division</label>
            <div className="relative">
              <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <select
                value={form.division}
                onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-accent-500 appearance-none"
              >
                <option value="">Select division</option>
                {['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA', 'High School'].map((d) => (
                  <option key={d} value={d} className="bg-surface text-white">{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-ink-muted mb-2">Recruiting Positions</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type="text"
                value={form.recruitingPositions}
                onChange={(e) => setForm((f) => ({ ...f, recruitingPositions: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-accent-500"
                placeholder="e.g. QB, WR, DB (comma separated)"
              />
            </div>
            <p className="text-[10px] text-ink-faint mt-1 ml-1">Separate positions with commas.</p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-ink-muted mb-2">Recruiting States</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type="text"
                value={form.recruitingStates}
                onChange={(e) => setForm((f) => ({ ...f, recruitingStates: e.target.value }))}
                className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-accent-500"
                placeholder="e.g. CA, TX, FL (comma separated)"
              />
            </div>
            <p className="text-[10px] text-ink-faint mt-1 ml-1">Separate states with commas.</p>
          </div>
        </div>
      </motion.div>

      {error && saveStatus === 'error' && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-colors ${
            saveStatus === 'saved'
              ? 'bg-green-500 text-white'
              : saveStatus === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-accent-500 hover:bg-accent-600 text-white'
          }`}
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Saving…
            </span>
          ) : saveStatus === 'saved' ? (
            'Saved!'
          ) : (
            <span className="inline-flex items-center gap-2">
              <Save size={18} />
              Save Changes
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
