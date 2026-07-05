import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export const ParentLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignOut = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    logout();
    navigate('/auth');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,10,10,0.84)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        position: 'sticky', top: 0, zIndex: 30, gap: 14,
      }}>
        <Link to="/parent" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900,
            fontSize: '1.35rem', letterSpacing: '0.04em',
            textTransform: 'uppercase', color: '#fff',
          }}>
            HERS<span style={{ color: '#ff5a2d' }}>365</span>
          </span>
        </Link>
        <span style={{
          fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#8a8a86',
          paddingLeft: 14, borderLeft: '1px solid rgba(255,255,255,0.1)',
        }}>
          Parent dashboard
        </span>
        <button
          onClick={handleSignOut}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 44, padding: '8px 14px', borderRadius: 9,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            color: '#8a8a86', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff5a2d'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8a8a86'; }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </header>
      <main id="main-content" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
};
