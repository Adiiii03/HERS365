import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CircleGauge,
  LayoutGrid,
  Users,
  ShieldCheck,
  CreditCard,
  Lock,
  Settings,
  LogOut,
  Bell,
  UserCircle,
  Menu,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MobileNav } from './MobileNav';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

// Purple-accented parent portal shell. Mirrors CoachLayout's structure
// (sidebar menu map + Outlet + MobileNav) but keys off the shared AuthContext
// since parents authenticate through the standard token, not a coach token.
const PARENT_ACCENT = { color: '#8B3BFF', bg: 'rgba(139,59,255,0.1)', border: 'rgba(139,59,255,0.3)' };

const menuItems = [
  { icon: CircleGauge, label: 'Dashboard', path: '/parent/dashboard' },
  { icon: LayoutGrid, label: 'The Grid', path: '/parent/grid' },
  { icon: Users, label: 'My Athletes', path: '/parent/athletes' },
  { icon: ShieldCheck, label: 'Verifications / Approvals', path: '/parent/verifications' },
  { icon: CreditCard, label: 'Billing / Subscription', path: '/parent/billing' },
  { icon: Lock, label: 'Privacy Controls', path: '/parent/privacy' },
];

export const ParentLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const parentName = user?.name || 'Parent';
  const parentInitials = parentName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  // `/parent` (root) renders the Dashboard, so treat it as the dashboard path for
  // nav highlighting + the header title.
  const activePath = location.pathname === '/parent' ? '/parent/dashboard' : location.pathname;
  // Treat a nav item as active on its sub-routes too (e.g. /parent/billing/checkout/pro
  // keeps "Billing / Subscription" highlighted).
  const matchesNav = (path: string) => activePath === path || activePath.startsWith(path + '/');
  const activeLabel = menuItems.find(i => matchesNav(i.path))?.label
    || (activePath.startsWith('/parent/settings') ? 'Settings' : 'Dashboard');

  const handleSignOut = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    logout();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-surface-card border-r border-white/5 flex-col p-6 shadow-2xl">
        {/* Wordmark logo, per Valerie's mockup: "HERS365" + a faint divider, with
            PARENT / DASHBOARD beneath (white / muted). No icon box. */}
        <div className="mb-10 px-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          <div className="flex items-end gap-2 leading-none">
            <h2 className="text-[26px] font-[800] uppercase text-white" style={{ letterSpacing: '0.04em' }}>HERS<span style={{ color: PARENT_ACCENT.color }}>365</span></h2>
            <span aria-hidden="true" className="text-[26px] font-light leading-none" style={{ color: 'rgba(255,255,255,0.22)' }}>|</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[13px] font-bold uppercase" style={{ letterSpacing: '0.12em' }}>
            <span className="text-white">Parent</span>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Dashboard</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = matchesNav(item.path);
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                  style={isActive
                    ? { background: PARENT_ACCENT.bg, border: `1px solid ${PARENT_ACCENT.border}`, color: PARENT_ACCENT.color }
                    : undefined}
                >
                  <item.icon size={20} className={isActive ? '' : 'text-ink-muted'} />
                  <span className={`font-semibold tracking-wide text-sm ${isActive ? '' : 'text-ink-muted'}`}>{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 pt-6 border-t border-white/5">
          <Link to="/parent/settings" className="flex items-center gap-3 px-4 py-3 text-ink-muted hover:text-white transition-colors">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-ink-muted hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center border border-white/10 shrink-0">
              {parentInitials
                ? <span className="text-xs font-black text-white tracking-wide">{parentInitials}</span>
                : <UserCircle className="text-ink-muted" size={24} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-white">{parentName}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: PARENT_ACCENT.color }}>
                Parent / Guardian
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none -mr-48 -mt-48" style={{ background: 'rgba(139,59,255,0.05)' }} />

        <header className="h-20 flex items-center justify-between gap-4 px-6 md:px-8 z-10 border-b border-white/5 backdrop-blur-md">
          {/* Page title removed from the header per Valerie's mockup (each page names itself in its
              own content). Kept screen-reader-only so every page still has one <h1>. */}
          <h1 className="hers-skel-sr">{activeLabel}</h1>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex md:hidden text-ink-muted hover:text-white transition-colors shrink-0"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/5 flex-1 max-w-md opacity-60" title="Search is coming soon">
              <Search size={16} className="text-ink-muted shrink-0" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search coming soon..."
                className="bg-transparent text-sm text-white placeholder:text-ink-muted outline-none w-full cursor-not-allowed"
                aria-label="Search (coming soon)"
                disabled
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              aria-label="Notifications (coming soon)"
              title="Notifications coming soon"
              disabled
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-ink-muted opacity-60 cursor-not-allowed"
            >
              <Bell size={18} aria-hidden="true" />
            </button>
            <div
              className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center border border-white/10"
              aria-hidden="true"
            >
              {parentInitials
                ? <span className="text-xs font-black text-white tracking-wide">{parentInitials}</span>
                : <UserCircle className="text-ink-muted" size={22} />}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-white transition-colors"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-0 scroll-smooth">
          <Outlet />
        </main>
      </div>

      <MobileNav
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={menuItems}
        accent={PARENT_ACCENT}
        title="Parent Portal"
        activePath={activePath}
      />
    </div>
  );
};
