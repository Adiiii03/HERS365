import { useState, type CSSProperties } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, ShieldCheck } from 'lucide-react';

const FLAME = '#8B3BFF';
const INK   = '#0a0a0a';
const TEXT  = '#f4f4f2';
const MUTED = '#9a9a96';
const LINE  = 'rgba(255,255,255,0.1)';
const FIELD = 'rgba(255,255,255,0.04)';
const DISP  = "'Barlow Condensed', sans-serif";
const BODY  = "'DM Sans', sans-serif";

const inputStyle: CSSProperties = {
  width: '100%', background: FIELD, border: `1px solid ${LINE}`,
  borderRadius: 10, padding: '13px 14px', fontSize: 15,
  color: TEXT, fontFamily: BODY, outline: 'none',
};

const labelStyle: CSSProperties = {
  display: 'block', textAlign: 'left', fontFamily: DISP, fontWeight: 700,
  fontSize: '.72rem', letterSpacing: '.14em', textTransform: 'uppercase',
  color: MUTED, margin: '0 0 7px',
};

export function GuardianVerify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const linkToken = params.get('token');

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(
    linkToken ? '' : 'This approval link is missing its token. Please open the link from the email we sent you.',
  );

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
        return;
      }
      switch (data?.code) {
        case 'INVALID_CODE':
          setError("That code doesn't match. Check the email carefully — the code is case sensitive and you have a limited number of tries.");
          break;
        case 'CODE_EXPIRED':
          setError('This approval code has expired. Ask your child to open the app and tap "Send the email again" — you\'ll get a fresh code.');
          break;
        case 'CODE_LOCKED':
          setError('Too many incorrect attempts, so this code is locked for safety. Ask your child to open the app and tap "Send the email again" for a new one.');
          break;
        case 'INVALID_CREDENTIALS':
          setError('That password doesn\'t match your existing parent account. Try again, or reset your password from the sign in page.');
          break;
        case 'PASSWORD_REQUIRED':
          setError('Please enter a password.');
          break;
        default:
          setError(data?.error || data?.message || "Something went wrong on our end — please try again.");
      }
    } catch {
      setError('Network error — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: INK,
      color: TEXT, fontFamily: BODY,
      alignItems: 'center', justifyContent: 'center', padding: '32px 0',
    }}>
      <div style={{
        maxWidth: 460, width: '100%', margin: '0 24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '40px 36px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: DISP, fontSize: 28, fontWeight: 700, letterSpacing: 1, color: FLAME, marginBottom: 24 }}>
          H.E.R.S.365
        </div>

        {done ? (
          <>
            <CheckCircle size={48} style={{ color: '#22c55e', margin: '0 auto 16px', display: 'block' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Your child's account is now active</h1>
            <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
              Thanks for approving. Your child can now sign in and use HERS365, and you can sign in
              any time to oversee their activity and coach contact.
            </p>
            <button
              onClick={() => navigate('/auth')}
              style={{
                background: FLAME, color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
              }}
            >
              Go to parent sign in
            </button>
          </>
        ) : (
          <>
            <ShieldCheck size={40} style={{ color: FLAME, margin: '0 auto 14px', display: 'block' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Approve your child's account</h1>
            <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, margin: '0 0 26px' }}>
              Your child signed up for HERS365, a moderated community for girls flag football.
              Their account stays locked until you approve it. Enter the 8 character code from
              the email we sent you.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="gv-code" style={labelStyle}>Approval code</label>
                <input
                  id="gv-code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  maxLength={8}
                  autoComplete="one-time-code"
                  placeholder="8 character code"
                  style={{ ...inputStyle, letterSpacing: '0.25em', textAlign: 'center', fontSize: 18, textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ marginBottom: 6 }}>
                <label htmlFor="gv-password" style={labelStyle}>Your password</label>
                <input
                  id="gv-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </div>
              <p style={{ color: MUTED, fontSize: 12.5, textAlign: 'left', margin: '0 0 16px', lineHeight: 1.5 }}>
                New here? This creates your parent account. Already have one? Enter your existing password.
              </p>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="gv-name" style={labelStyle}>Your name (optional)</label>
                <input
                  id="gv-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>

              {error && (
                <p role="alert" style={{
                  color: '#ff9a8a', fontSize: 13.5, textAlign: 'left', fontWeight: 600,
                  padding: '11px 14px', borderRadius: 10, margin: '0 0 16px', lineHeight: 1.5,
                  background: 'rgba(139,59,255,0.08)', border: '1px solid rgba(139,59,255,0.2)',
                }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !linkToken}
                style={{
                  background: FLAME, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '13px 28px', fontSize: 15, fontWeight: 600, width: '100%',
                  cursor: submitting || !linkToken ? 'not-allowed' : 'pointer',
                  opacity: submitting || !linkToken ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {submitting ? 'Approving…' : "Approve my child's account"}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
