import { useState, type CSSProperties } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useHaptics } from '../lib/haptics';
import { colors, type as t, radii, spacing } from '../lib/tokens';
import { Button, Input } from '../components/ui';

const codeInputStyle: CSSProperties = {
  letterSpacing: '0.25em',
  textAlign: 'center',
  fontSize: t.size.lg,
  textTransform: 'uppercase',
};

export function GuardianVerify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const haptics = useHaptics();
  const linkToken = params.get('token');

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(
    linkToken ? '' : 'This approval link is missing its token. Please open the link from the email we sent you.',
  );

  const fail = (message: string) => {
    setError(message);
    haptics.press();
    showNotification('error', "Couldn't approve", message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkToken) return;
    setError('');
    if (code.trim().length !== 8) {
      setError('The approval code is 8 characters — check the email we sent you.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/guardian/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkToken,
          code: code.trim(),
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.activated) {
        setDone(true);
        haptics.notify();
        showNotification('success', 'Account activated', "Your child's account is now active. You can sign in any time to oversee their activity.");
        return;
      }
      switch (data?.code) {
        case 'INVALID_CODE':
          fail("That code doesn't match. Check the email carefully — the code is case sensitive and you have a limited number of tries.");
          break;
        case 'CODE_EXPIRED':
          fail('This approval code has expired. Ask your child to open the app and tap "Send the email again" — you\'ll get a fresh code.');
          break;
        case 'CODE_LOCKED':
          fail('Too many incorrect attempts, so this code is locked for safety. Ask your child to open the app and tap "Send the email again" for a new one.');
          break;
        case 'INVALID_CREDENTIALS':
          fail('That password doesn\'t match your existing parent account. Try again, or reset your password from the sign in page.');
          break;
        case 'PASSWORD_REQUIRED':
          fail('Please enter a password.');
          break;
        default:
          fail(data?.error || data?.message || "Something went wrong on our end — please try again.");
      }
    } catch {
      fail('Network error — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: colors.surface0,
      color: colors.textPrimary, fontFamily: t.font.body,
      alignItems: 'center', justifyContent: 'center', padding: `${spacing.space6} 0`,
    }}>
      <div style={{
        maxWidth: 460, width: '100%', margin: `0 ${spacing.space5}`,
        background: colors.surface1,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.xl, padding: '40px 36px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: t.font.display, fontSize: t.size['2xl'], fontWeight: t.weight.bold, letterSpacing: 1, color: colors.accent, marginBottom: spacing.space5 }}>
          H.E.R.S.365
        </div>

        {done ? (
          <>
            <CheckCircle size={48} style={{ color: colors.success, margin: '0 auto 16px', display: 'block' }} />
            <h1 style={{ fontSize: t.size.xl, fontWeight: t.weight.bold, margin: '0 0 10px' }}>Your child's account is now active</h1>
            <p style={{ color: colors.textSecondary, fontSize: t.size.md, lineHeight: 1.6, margin: '0 0 28px' }}>
              Thanks for approving. Your child can now sign in and use HERS365, and you can sign in
              any time to oversee their activity and coach contact.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to parent sign in
            </Button>
          </>
        ) : (
          <>
            <ShieldCheck size={40} style={{ color: colors.accent, margin: '0 auto 14px', display: 'block' }} />
            <h1 style={{ fontSize: t.size.xl, fontWeight: t.weight.bold, margin: '0 0 10px' }}>Approve your child's account</h1>
            <p style={{ color: colors.textSecondary, fontSize: t.size.md, lineHeight: 1.6, margin: '0 0 26px' }}>
              Your child signed up for HERS365, a moderated community for girls flag football.
              Their account stays locked until you approve it. Enter the 8 character code from
              the email we sent you.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <Input
                  id="gv-code"
                  label="Approval code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  maxLength={8}
                  autoComplete="one-time-code"
                  placeholder="8 character code"
                  style={codeInputStyle}
                />
              </div>

              <div style={{ marginBottom: 6, textAlign: 'left' }}>
                <Input
                  id="gv-password"
                  label="Your password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <p style={{ color: colors.textSecondary, fontSize: t.size.xs, textAlign: 'left', margin: '0 0 16px', lineHeight: 1.5 }}>
                New here? This creates your parent account. Already have one? Enter your existing password.
              </p>

              <div style={{ marginBottom: 20, textAlign: 'left' }}>
                <Input
                  id="gv-name"
                  label="Your name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              {error && (
                <p role="alert" style={{
                  color: colors.dangerText, fontSize: t.size.sm, textAlign: 'left', fontWeight: t.weight.semibold,
                  padding: '11px 14px', borderRadius: radii.md, margin: '0 0 16px', lineHeight: 1.5,
                  background: 'rgba(139,59,255,0.08)', border: '1px solid rgba(139,59,255,0.2)',
                }}>{error}</p>
              )}

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                disabled={!linkToken}
                className="w-full"
              >
                {submitting ? 'Approving…' : "Approve my child's account"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
