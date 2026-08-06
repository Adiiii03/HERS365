import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LayoutGrid, Compass, MessageSquare, User } from 'lucide-react';
import { BottomTabBar } from './BottomTabBar';
import type { NavTab } from './navTabs';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { variants } from '../lib/motion';
import { colors, type as t, radii } from '../lib/tokens';

export const ParentLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const parentTabs: NavTab[] = [
    { icon: LayoutGrid,    label: 'Dashboard', path: '/parent' },
    { icon: Compass,       label: 'Hub',       path: '/hub' },
    { icon: MessageSquare, label: 'Messages',  path: '/messages' },
    { icon: User,          label: 'Profile',   path: '/profile' },
  ];

  const handleSignOut = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    logout();
    navigate('/auth');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.surface0, color: colors.textPrimary }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 20px',
        borderBottom: `1px solid ${colors.border}`,
        background: 'rgba(10,10,10,0.84)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        position: 'sticky', top: 0, zIndex: 30, gap: 14,
      }}>
        <Link to="/parent" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontFamily: t.font.display, fontWeight: t.weight.bold,
            fontSize: t.size.xl, letterSpacing: '0.04em',
            textTransform: 'uppercase', color: colors.textPrimary,
          }}>
            HERS<span style={{ color: colors.accent }}>365</span>
          </span>
        </Link>
        <span style={{
          fontSize: t.size.sm, fontWeight: t.weight.bold, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: colors.textSecondary,
          paddingLeft: 14, borderLeft: `1px solid ${colors.border}`,
        }}>
          Parent dashboard
        </span>
        <button
          onClick={handleSignOut}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 44, padding: '8px 14px', borderRadius: radii.sm,
            background: 'transparent', border: `1px solid ${colors.border}`,
            color: colors.textSecondary, cursor: 'pointer',
            fontSize: t.size.sm, fontWeight: t.weight.bold, letterSpacing: '0.04em',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = colors.accent; }}
          onMouseLeave={e => { e.currentTarget.style.color = colors.textSecondary; }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </header>
      <main id="main-content" style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...variants.pageTransition}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomTabBar tabs={parentTabs} />
    </div>
  );
};
