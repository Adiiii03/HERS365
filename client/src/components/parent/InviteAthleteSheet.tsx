import { useState } from 'react';
import { Check } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Button, Input, Sheet } from '../ui';
import { colors, type as t } from '../../lib/tokens';

// Invite / link an athlete by email -> POST /api/parent/invite-athlete (real).
// Extracted from ParentDashboard so the Dashboard and My Athletes share one "+"
// add flow instead of duplicating the Sheet + state.

export interface InviteAthleteSheetProps {
  open: boolean;
  onClose: () => void;
  onInvited?: () => void | Promise<void>;
}

export const InviteAthleteSheet = ({ open, onClose, onInvited }: InviteAthleteSheetProps) => {
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('parent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const close = () => {
    onClose();
    setEmail('');
    setRelationship('parent');
    setError(null);
    setDone(null);
    setBusy(false);
  };

  const submit = async () => {
    const value = email.trim();
    if (!value) { setError('Enter the athlete’s email.'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; data?: { status?: string; message?: string } }>(
        '/api/parent/invite-athlete',
        { method: 'POST', body: JSON.stringify({ email: value, relationship }) },
      );
      if (res?.success) {
        setDone(res.data?.message
          || (res.data?.status === 'linked' ? 'Athlete linked to your account.' : 'Invite queued.'));
        await onInvited?.();
      } else {
        setError('Could not send the invite. Try again.');
      }
    } catch {
      setError('Could not send the invite. Check the email and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} label="Invite an athlete">
      <h3 className="text-lg font-bold text-white" style={{ fontFamily: t.font.display }}>Invite an athlete</h3>
      <p className="mt-1 mb-4 text-sm" style={{ color: colors.textTertiary }}>
        Link your athlete by their email. If they already have an account they are linked right away,
        otherwise the invite is queued until they sign up.
      </p>
      {done ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: colors.successText }}>
            <Check size={18} /> {done}
          </div>
          <Button variant="primary" className="w-full" onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Athlete email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="athlete@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error ?? undefined}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-rel" className="text-[0.72rem] font-semibold uppercase tracking-[0.08em]" style={{ color: colors.textSecondary }}>
              Relationship
            </label>
            <select
              id="invite-rel"
              className="k-input w-full min-h-[44px] px-3.5 py-2.5"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            >
              <option value="parent">Parent</option>
              <option value="guardian">Legal guardian</option>
              <option value="other">Other authorized adult</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="primary" className="flex-1" loading={busy} onClick={submit}>Send invite</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
};

export default InviteAthleteSheet;
