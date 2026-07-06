import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiFetch, errorMessage } from '../lib/api';
import { Button } from '../components/ui';
import { colors, type as t, radii } from '../lib/tokens';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const token = params.get('token');
  // Derive the missing-token error state during render so we never synchronously
  // setState from inside the effect — that pattern triggers a cascading render
  // and the react-compiler lint rule blocks it.
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Verification link is missing a token. Check the link in your email.');

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/auth/email/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((res: any) => {
        setStatus('success');
        setMessage(res.message || 'Email verified.');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(errorMessage(err, 'Verification link is invalid or expired.'));
      });
  }, [token]);

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: colors.surface0,
      color: colors.textPrimary, fontFamily: t.font.body,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 440, width: '100%', margin: '0 24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: radii.lg, padding: '40px 36px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: t.font.display, fontSize: 28, fontWeight: 700, letterSpacing: 1, color: colors.accent, marginBottom: 28 }}>
          H.E.R.S.365
        </div>

        {status === 'loading' && (
          <>
            <Loader2 size={40} style={{ color: colors.accent, margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: colors.textSecondary, fontSize: 15 }}>Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} style={{ color: colors.success, margin: '0 auto 16px', display: 'block' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>You're verified</h1>
            <p style={{ color: colors.textSecondary, fontSize: 15, margin: '0 0 28px' }}>{message}</p>
            <Button size="lg" onClick={() => navigate('/')} style={{ width: '100%' }}>
              Go to my profile
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} style={{ color: colors.danger, margin: '0 auto 16px', display: 'block' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Verification failed</h1>
            <p style={{ color: colors.textSecondary, fontSize: 15, margin: '0 0 28px' }}>{message}</p>
            <Button variant="ghost" size="lg" onClick={() => navigate('/auth')} style={{ width: '100%' }}>
              Back to sign in
            </Button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
