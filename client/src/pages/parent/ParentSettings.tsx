import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Bell, KeyRound, ShieldCheck, CreditCard, Palette, UserCog,
  Check, LogOut, Download, AlertTriangle, ExternalLink, Moon, Sun, Laptop,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Input, Switch } from '../../components/ui';
import { colors } from '../../lib/tokens';

// Settings (Valerie's P.P - SETTINGS, 7 sub-screens). Spec: output/parent-portal-spec/settings.md.
// Real surfaces: GET|PUT /api/parent/settings (parents.preferences blob), the auth user identity,
// and client sign-out. Everything else (profile edits, password, 2FA, data export, banking) has no
// parent endpoint and is rendered disabled/explained rather than as a working-looking no-op. The
// Privacy & Security sub-screen defers to the standalone Privacy Controls page to avoid duplicating
// its visibility/messaging toggles.

type TabId = 'profile' | 'notifications' | 'password' | 'privacy' | 'banking' | 'appearance' | 'account';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'password', label: 'Password Reset', icon: KeyRound },
  { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  { id: 'banking', label: 'Banking Information', icon: CreditCard },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'account', label: 'Account', icon: UserCog },
];

function initialsOf(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function boolPref(prefs: Record<string, unknown>, key: string, dflt = true): boolean {
  const v = prefs[key];
  return typeof v === 'boolean' ? v : dflt;
}

const NotAvailable = () => (
  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
    Not available yet
  </span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: colors.textSecondary }}>{children}</h3>
);

const SavedTag = ({ show }: { show: boolean }) => show
  ? <span className="inline-flex items-center gap-1 text-xs" style={{ color: colors.successText }}><Check size={13} /> Saved</span>
  : null;

const ToggleRow = ({ label, desc, checked, onChange, disabled = false, enforced = true, saved = false, error = false }: {
  label: string; desc: string; checked: boolean;
  onChange?: (next: boolean) => void; disabled?: boolean; enforced?: boolean; saved?: boolean; error?: boolean;
}) => (
  <div className="flex items-center gap-4 py-4">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-white">{label}</p>
        <SavedTag show={saved} />
      </div>
      <p className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>{desc}</p>
      {!enforced && !disabled && (
        <p className="text-xs mt-1 font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
          Saved, delivery depends on the notification system
        </p>
      )}
      {disabled && <p className="mt-1"><NotAvailable /></p>}
      {error && (
        <p className="text-xs mt-1" style={{ color: colors.dangerText }}>Couldn&rsquo;t save. Try again.</p>
      )}
    </div>
    <Switch checked={checked} onChange={(next) => onChange?.(next)} disabled={disabled} label={label} />
  </div>
);

export const ParentSettings = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<TabId>('profile');
  const [prefs, setPrefs] = useState<Record<string, unknown>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Editable profile (name + phone) backed by GET|PUT /api/parent/profile.
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const name = user?.name || 'Parent';
  const email = user?.email || '';

  const loadPrefs = useCallback(async (): Promise<Record<string, unknown> | null> => {
    const res = await apiFetch<{ success: boolean; data?: Record<string, unknown> }>('/api/parent/settings').catch(() => null);
    if (res?.success && res.data) return res.data;
    return null;
  }, []);

  useEffect(() => {
    let ignore = false;
    loadPrefs().then(p => { if (!ignore && p) setPrefs(p); });
    return () => { ignore = true; };
  }, [loadPrefs]);

  // Save-on-change: PUT the single-key patch and reflect it locally. Matches the
  // mockup's "Saved to your account" affordance.
  const savePref = useCallback(async (key: string, value: unknown) => {
    let prior: unknown;
    setErrorKey(k => (k === key ? null : k));
    setPrefs(prev => { prior = prev[key]; return { ...prev, [key]: value }; });
    const res = await apiFetch<{ success: boolean }>('/api/parent/settings', {
      method: 'PUT',
      body: JSON.stringify({ [key]: value }),
    }).catch(() => null);
    if (res?.success) {
      setSavedKey(key);
      setTimeout(() => setSavedKey(k => (k === key ? null : k)), 1500);
    } else {
      // Roll the optimistic value back so a failed save never looks applied.
      setPrefs(prev => ({ ...prev, [key]: prior }));
      setErrorKey(key);
    }
  }, []);

  // Load the editable profile fields (name prefills from the auth user as a fallback).
  useEffect(() => {
    let ignore = false;
    apiFetch<{ success: boolean; data?: { name?: string; phone?: string | null; memberSince?: string | null } }>('/api/parent/profile')
      .then(res => {
        if (ignore || !res?.success || !res.data) return;
        setProfileName(res.data.name ?? user?.name ?? '');
        setProfilePhone(res.data.phone ?? '');
        setMemberSince(res.data.memberSince ?? null);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [user?.name]);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileError(false);
    setProfileSaved(false);
    const body: Record<string, unknown> = { phone: profilePhone.trim() ? profilePhone.trim() : null };
    if (profileName.trim()) body.name = profileName.trim();
    const res = await apiFetch<{ success: boolean }>('/api/parent/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }).catch(() => null);
    setProfileSaving(false);
    if (res?.success) {
      if (typeof body.name === 'string') updateUser({ name: body.name });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 1500);
    } else {
      setProfileError(true);
    }
  };

  const handleSignOut = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    logout();
    navigate('/auth');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Sub-nav */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                aria-current={on ? 'page' : undefined}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shrink-0"
                style={on
                  ? { background: 'rgba(139,59,255,0.1)', border: `1px solid rgba(139,59,255,0.3)`, color: colors.accent }
                  : { color: colors.textTertiary }}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Detail pane */}
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {active === 'profile' && (
            <div className="space-y-6">
              <Card className="p-6">
                <SectionTitle>Profile Picture</SectionTitle>
                <div className="flex items-center gap-4">
                  <span className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white" style={{ background: colors.surface2, border: `2px solid ${colors.accent}` }}>
                    {initialsOf(name)}
                  </span>
                  <div>
                    <Button variant="ghost" size="sm" disabled title="Photo upload isn't available yet">Upload Photo</Button>
                    <p className="mt-1 text-xs" style={{ color: colors.textTertiary }}>JPEG, PNG, WebP, or GIF. 5MB max. <NotAvailable /></p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <SectionTitle>Personal Information</SectionTitle>
                <div className="space-y-4">
                  <Input label="Full name" value={profileName} onChange={e => setProfileName(e.target.value)} />
                  <Input label="Email" value={email} readOnly title="Email changes aren't available yet" />
                  <Input label="Phone" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="e.g. (555) 867-5309" />
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Button variant="primary" onClick={saveProfile} loading={profileSaving} disabled={profileSaving || !profileName.trim()}>Save</Button>
                  {profileSaved && <span className="inline-flex items-center gap-1 text-sm" style={{ color: colors.successText }}><Check size={14} /> Saved</span>}
                  {profileError && <span className="text-sm" style={{ color: colors.dangerText }}>Couldn&rsquo;t save. Try again.</span>}
                </div>
              </Card>
            </div>
          )}

          {active === 'notifications' && (
            <Card className="p-6">
              <SectionTitle>Notification Preferences</SectionTitle>
              <p className="-mt-3 mb-2 text-xs" style={{ color: colors.textTertiary }}>Saved to your account.</p>
              <div className="divide-y divide-white/5">
                <ToggleRow label="Email Notifications" desc="Receive notifications via email."
                  checked={boolPref(prefs, 'emailNotifications')} onChange={(v) => savePref('emailNotifications', v)} enforced={false} saved={savedKey === 'emailNotifications'} error={errorKey === 'emailNotifications'} />
                <ToggleRow label="Mobile Notifications" desc="Receive notifications on your phone through messages."
                  checked={boolPref(prefs, 'mobileNotifications')} onChange={(v) => savePref('mobileNotifications', v)} enforced={false} saved={savedKey === 'mobileNotifications'} error={errorKey === 'mobileNotifications'} />
                <ToggleRow label="Push Notifications" desc="Receive push notifications in your browser."
                  checked={boolPref(prefs, 'pushNotifications')} onChange={(v) => savePref('pushNotifications', v)} enforced={false} saved={savedKey === 'pushNotifications'} error={errorKey === 'pushNotifications'} />
                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">Contact Permissions</p>
                      <SavedTag show={savedKey === 'contactPermissions'} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>Control whether schools and programs can reach you by email and SMS.</p>
                    {errorKey === 'contactPermissions' && (
                      <p className="text-xs mt-1" style={{ color: colors.dangerText }}>Couldn&rsquo;t save. Try again.</p>
                    )}
                  </div>
                  <select
                    className="k-input min-h-[40px] px-3 py-2 shrink-0"
                    value={typeof prefs.contactPermissions === 'string' ? prefs.contactPermissions : 'email_only'}
                    onChange={(e) => savePref('contactPermissions', e.target.value)}
                    aria-label="Contact permissions"
                  >
                    <option value="email_only">Email only</option>
                    <option value="sms_only">SMS only</option>
                    <option value="both">Email and SMS</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {active === 'password' && (
            <Card className="p-6">
              <SectionTitle>Password Reset</SectionTitle>
              <div className="space-y-4">
                <Input label="Current password" type="password" placeholder="••••••••" disabled />
                <Input label="New password" type="password" placeholder="Enter new password" disabled />
                <Input label="Confirm new password" type="password" placeholder="Re-enter new password" disabled />
              </div>
              <p className="mt-3 text-xs" style={{ color: colors.textTertiary }}>
                Password must be at least 8 characters and include a number and a special character.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <Button variant="primary" disabled title="Password reset isn't available yet">Update Password</Button>
                <NotAvailable />
              </div>
            </Card>
          )}

          {active === 'privacy' && (
            <div className="space-y-6">
              <Card className="p-6">
                <SectionTitle>Privacy & Security</SectionTitle>
                <p className="-mt-3 mb-4 text-xs" style={{ color: colors.textTertiary }}>Choose how your account is protected and who can contact you.</p>
                <div className="divide-y divide-white/5">
                  <ToggleRow label="Two-factor authentication" desc="Require a verification code when signing in from a new device."
                    checked={false} disabled />
                  <ToggleRow label="Security alerts" desc="Get notified about sign-in attempts, password changes, and account activity."
                    checked={boolPref(prefs, 'securityAlerts')} onChange={(v) => savePref('securityAlerts', v)} enforced={false} saved={savedKey === 'securityAlerts'} error={errorKey === 'securityAlerts'} />
                </div>
              </Card>
              <Card className="p-6">
                <SectionTitle>Profile Visibility & Messaging</SectionTitle>
                <p className="text-sm" style={{ color: colors.textTertiary }}>
                  Your child&rsquo;s profile visibility, messaging, and contact controls live on the
                  Privacy Controls page so there&rsquo;s a single source of truth.
                </p>
                <Link to="/parent/privacy" className="mt-4 inline-flex items-center gap-2 text-sm font-bold" style={{ color: colors.accent }}>
                  Go to Privacy Controls <ExternalLink size={14} />
                </Link>
              </Card>
            </div>
          )}

          {active === 'banking' && (
            <Card className="p-6">
              <SectionTitle>Banking Information</SectionTitle>
              <p className="-mt-3 mb-4 text-xs" style={{ color: colors.textTertiary }}>Update billing details used for tuition, camps, and recurring payments.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Cardholder name" placeholder="Name on card" disabled className="sm:col-span-2" />
                <Input label="Card number" placeholder="•••• •••• •••• ••••" disabled className="sm:col-span-2" />
                <Input label="Expiry" placeholder="MM / YY" disabled />
                <Input label="CVC" placeholder="123" disabled />
                <Input label="Billing ZIP code" placeholder="90210" disabled />
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl p-3" style={{ background: colors.surface1, border: `1px solid ${colors.border}` }}>
                <ShieldCheck size={16} style={{ color: colors.textTertiary }} className="mt-0.5 shrink-0" />
                <p className="text-xs" style={{ color: colors.textTertiary }}>
                  Payments aren&rsquo;t connected yet. When they are, card details will be captured
                  securely through Stripe, never entered or stored on our servers.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Button variant="primary" disabled title="Banking isn't available yet">Update Banking Details</Button>
                <NotAvailable />
              </div>
            </Card>
          )}

          {active === 'appearance' && (
            <div className="space-y-6">
              <Card className="p-6">
                <SectionTitle>Theme</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'dark', label: 'Dark', desc: 'Classic dark theme', icon: Moon, enabled: true },
                    { key: 'light', label: 'Light', desc: 'Light theme', icon: Sun, enabled: false },
                    { key: 'auto', label: 'Auto', desc: 'Follow system', icon: Laptop, enabled: false },
                  ].map(th => (
                    <div
                      key={th.key}
                      className="rounded-xl p-4 text-center"
                      style={{
                        background: colors.surface1,
                        border: th.key === 'dark' ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                        opacity: th.enabled ? 1 : 0.5,
                      }}
                    >
                      <th.icon size={20} className="mx-auto" style={{ color: th.key === 'dark' ? colors.accent : colors.textTertiary }} />
                      <p className="mt-2 text-sm font-bold text-white">{th.label}</p>
                      <p className="text-xs" style={{ color: colors.textTertiary }}>{th.desc}</p>
                      {!th.enabled && <p className="mt-1"><NotAvailable /></p>}
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <SectionTitle>Language &amp; Region</SectionTitle>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Language" value="English (US)" disabled />
                  <Input label="Timezone" value="Eastern Time (ET)" disabled />
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Button variant="primary" disabled title="Language & region settings aren't available yet">Update</Button>
                  <NotAvailable />
                </div>
              </Card>
            </div>
          )}

          {active === 'account' && (
            <div className="space-y-6">
              <Card className="p-6">
                <SectionTitle>Account Information</SectionTitle>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt style={{ color: colors.textTertiary }}>Account Type</dt>
                    <dd><Badge tone="accent">{(user?.role || 'parent').replace(/^\w/, c => c.toUpperCase())}</Badge></dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt style={{ color: colors.textTertiary }}>Account Status</dt>
                    <dd><NotAvailable /></dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt style={{ color: colors.textTertiary }}>Member Since</dt>
                    <dd className="font-bold text-white">
                      {memberSince
                        ? new Date(memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
                        : <NotAvailable />}
                    </dd>
                  </div>
                </dl>
              </Card>
              <Card className="p-6">
                <SectionTitle>Data Management</SectionTitle>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Download My Data</p>
                    <p className="text-xs" style={{ color: colors.textTertiary }}>Download your profile as JSON.</p>
                  </div>
                  <Button variant="ghost" size="sm" disabled title="Data export isn't available yet"><Download size={15} /> Export</Button>
                </div>
              </Card>
              <Card className="p-6">
                <SectionTitle>End Session</SectionTitle>
                <Button variant="ghost" onClick={handleSignOut}><LogOut size={16} /> Sign Out</Button>
              </Card>
              <Card className="p-6" style={{ borderColor: 'rgba(255,46,147,0.3)' }}>
                <SectionTitle>Danger Zone</SectionTitle>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} style={{ color: colors.pinkText }} className="mt-0.5 shrink-0" />
                  <p className="text-xs" style={{ color: colors.textTertiary }}>
                    Account deletion is handled by our support team. Email{' '}
                    <span className="font-semibold text-white">support@hers365.com</span> to request deletion.
                  </p>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ParentSettings;
