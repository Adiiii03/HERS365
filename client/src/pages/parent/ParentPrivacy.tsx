import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eye, BarChart3, Trophy, MessageSquare, UserCheck, FileCheck, Users, Activity, Camera } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Card, Button, Switch } from '../../components/ui';
import { colors, type as t } from '../../lib/tokens';

// Privacy Controls (Valerie's P.P - PRIVACY & CONTROLS). Toggles persist in the
// parents.preferences blob via GET|PUT /api/parent/settings. Only "Hide Profile
// from Public Search" is backed by a real, child-propagating control
// (profileVisibility -> players.coachDiscoverable). The other six persist but
// the backend does not enforce them yet, so each is marked "Not enforced yet".

type ToggleId =
  | 'hideProfile' | 'hideStats' | 'hideRanking'
  | 'restrictDMs' | 'disableGroupChat'
  | 'requireProfileApproval' | 'requireApproval'
  | 'hideActivityFeed' | 'disablePhotoTagging';

interface ToggleDef {
  id: ToggleId;
  label: string;
  desc: string;
  icon: React.ElementType;
  enforced: boolean; // false => persists only, backend does not act on it yet
}

const GROUPS: { title: string; items: ToggleDef[] }[] = [
  {
    title: 'Profile Visibility',
    items: [
      { id: 'hideProfile', label: 'Hide Profile from Public Search', icon: Eye, enforced: true,
        desc: "When enabled, your child's profile won't appear in public directory search results or be visible to non-connected users." },
      { id: 'hideStats', label: 'Hide Statistics & Performance Data', icon: BarChart3, enforced: false,
        desc: 'Prevent coaches and scouts outside your connected network from viewing historical stats and test results.' },
      { id: 'hideRanking', label: 'Hide from Public Rankings', icon: Trophy, enforced: true,
        desc: "Keep your child off public leaderboards and ranking pages. Applies to their linked athlete profile." },
    ],
  },
  {
    title: 'Messaging Controls',
    items: [
      { id: 'restrictDMs', label: 'Restrict Direct Messages', icon: MessageSquare, enforced: false,
        desc: 'Only approved contacts, connected team members, and verified organization coaches can message your child.' },
      { id: 'disableGroupChat', label: 'Disable Group Chat Invitations', icon: Users, enforced: false,
        desc: 'Prevent your child from being added to group threads or roster chats without your permission.' },
    ],
  },
  {
    title: 'Approvals',
    items: [
      { id: 'requireProfileApproval', label: 'Require Approval for Profile Changes', icon: FileCheck, enforced: false,
        desc: 'Profile edits your athlete makes (photo, stats, school) are held for your review on Verifications / Approvals before they go live.' },
      { id: 'requireApproval', label: 'Require Approval for New Contacts', icon: UserCheck, enforced: false,
        desc: 'You must review and approve before any new athlete or coach can connect with your child.' },
    ],
  },
  {
    title: 'Content & Activity',
    items: [
      { id: 'hideActivityFeed', label: 'Hide Activity Feed', icon: Activity, enforced: false,
        desc: "Your child's recent check-ins, achievements, and training logs won't be pushed to the public feed." },
      { id: 'disablePhotoTagging', label: 'Disable Photo Tagging', icon: Camera, enforced: false,
        desc: 'Prevent others from tagging your child in media uploads, photo galleries, or game updates.' },
    ],
  },
];

type ToggleState = Record<ToggleId, boolean>;

const ALL_IDS = GROUPS.flatMap(g => g.items.map(i => i.id));

// Derive UI toggle state from the stored preferences blob. "Hide Profile" is the
// inverse of profileVisibility, and an unset profileVisibility means visible
// (discoverable) -> the Hide toggle must read OFF.
function stateFromPrefs(prefs: Record<string, unknown>): ToggleState {
  const s = {} as ToggleState;
  for (const id of ALL_IDS) {
    if (id === 'hideProfile') {
      const visible = prefs.profileVisibility;
      s.hideProfile = !(typeof visible === 'boolean' ? visible : true);
    } else if (id === 'hideRanking') {
      // Inverse of rankingVisibility (real, child-propagating), same shape as hideProfile.
      const visible = prefs.rankingVisibility;
      s.hideRanking = !(typeof visible === 'boolean' ? visible : true);
    } else {
      s[id] = prefs[id] === true;
    }
  }
  return s;
}

function prefsFromState(s: ToggleState): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    profileVisibility: !s.hideProfile,
    rankingVisibility: !s.hideRanking,
  };
  for (const id of ALL_IDS) {
    if (id !== 'hideProfile' && id !== 'hideRanking') patch[id] = s[id];
  }
  return patch;
}

export const ParentPrivacy = () => {
  const [baseline, setBaseline] = useState<ToggleState | null>(null);
  const [state, setState] = useState<ToggleState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<{ success: boolean; data?: Record<string, unknown> }>('/api/parent/settings')
      .catch(() => null);
    const prefs = (res?.success && res.data) ? res.data : {};
    const s = stateFromPrefs(prefs);
    setBaseline(s);
    setState(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = !!state && !!baseline && ALL_IDS.some(id => state[id] !== baseline[id]);

  const set = (id: ToggleId, next: boolean) => {
    setSavedMsg(false);
    setSaveError(false);
    setState(prev => prev ? { ...prev, [id]: next } : prev);
  };

  const save = async () => {
    if (!state) return;
    setSaving(true);
    setSavedMsg(false);
    setSaveError(false);
    try {
      const res = await apiFetch<{ success: boolean }>('/api/parent/settings', {
        method: 'PUT',
        body: JSON.stringify(prefsFromState(state)),
      }).catch(() => null);
      if (res?.success) {
        setBaseline(state);
        setSavedMsg(true);
      } else {
        // Leave the (dirty) state in place so the parent can retry; never imply
        // these privacy toggles saved when they didn't.
        setSaveError(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSavedMsg(false);
    setSaveError(false);
    if (baseline) setState(baseline);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-[800] uppercase leading-[0.9] tracking-tight text-white" style={{ fontFamily: t.font.display }}>
          Privacy <span style={{ color: colors.accent }}>Controls</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed max-w-2xl" style={{ color: colors.textSecondary }}>
          Control how your child&rsquo;s profile, messages, and activity are shared.
        </p>
      </div>

      {GROUPS.map((group, gi) => (
        <motion.div
          key={group.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * gi }}
        >
          <Card className="overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: colors.textSecondary }}>
                {group.title}
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {group.items.map(({ id, label, desc, icon: Icon, enforced }) => (
                <div key={id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-xl bg-surface-hover border border-white/5 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-ink-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: colors.textSecondary }}>{desc}</p>
                    {!enforced && (
                      <p className="text-[0.65rem] mt-1 font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                        Saved, not enforced yet
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={state ? state[id] : false}
                    onChange={(next) => set(id, next)}
                    disabled={!state}
                    label={label}
                  />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>Save Changes</Button>
        <Button variant="ghost" onClick={reset} disabled={!dirty || saving}>Reset</Button>
        {savedMsg && (
          <span className="text-sm" style={{ color: colors.successText }}>Saved.</span>
        )}
        {saveError && (
          <span className="text-sm" style={{ color: colors.dangerText }}>Couldn&rsquo;t save. Try again.</span>
        )}
      </div>
    </div>
  );
};

export default ParentPrivacy;
