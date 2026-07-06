import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Zap, MessageSquare, Heart, UserPlus, TrendingUp, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NOTIF_TYPE_LABELS, type Notification } from '../hooks/useNotifications';
import { colors, text, type as typeTokens, radii } from '../lib/tokens';

const LINE = 'rgba(255,255,255,0.07)';
const DISP = typeTokens.font.display;

const TYPE_ICON: Record<string, React.ReactNode> = {
  like: <Heart size={13} color={colors.pink} />,
  comment: <MessageSquare size={13} color={colors.accent} />,
  follow: <UserPlus size={13} color={colors.success} />,
  mention: <MessageSquare size={13} color={colors.pink} />,
  coach_interest: <Star size={13} color={colors.accent} />,
  message_request: <MessageSquare size={13} color={colors.accent} />,
  ranking_change: <TrendingUp size={13} color={colors.accent} />,
  subscription: <Zap size={13} color={colors.accent} />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function navTargetFor(type: string): string | null {
  if (type === 'message_request' || type === 'coach_interest') return '/messages';
  if (type === 'ranking_change') return '/rankings';
  return null;
}

function NotifRow({ n, onRead, onNav }: { n: Notification; onRead: (id: number) => void; onNav: (path: string) => void }) {
  const label = NOTIF_TYPE_LABELS[n.type] || n.type;
  const target = navTargetFor(n.type);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => {
        if (!n.read) onRead(n.id);
        if (target) onNav(target);
      }}
      style={{
        display: 'flex', gap: 10, padding: '11px 14px',
        background: n.read ? 'transparent' : 'rgba(139,59,255,0.05)',
        borderBottom: `1px solid ${LINE}`,
        cursor: 'pointer',
        transition: 'background 0.18s',
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: radii.full, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {TYPE_ICON[n.type] || <Bell size={13} color={text.secondary} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', color: n.read ? text.secondary : text.primary, lineHeight: 1.35 }}>
          {n.actorName && <strong style={{ color: text.primary }}>{n.actorName} </strong>}{label}
        </div>
        <div style={{ fontSize: '0.65rem', color: text.tertiary, marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
      </div>
      {!n.read && <div style={{ width: 7, height: 7, borderRadius: radii.full, background: colors.pink, flexShrink: 0, marginTop: 4 }} />}
    </motion.div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications(!!token);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={handleOpen}
        style={{ position: 'relative', width: 36, height: 36, borderRadius: radii.full, background: open ? 'rgba(139,59,255,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${open ? 'rgba(139,59,255,0.3)' : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.18s, border-color 0.18s' }}
      >
        <Bell size={16} color={open ? colors.accent : text.secondary} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: radii.full, background: colors.pink, border: `1.5px solid ${colors.surface0}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 900, color: colors.pinkOn }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              position: 'absolute', right: 0, top: 44, zIndex: 100,
              width: 320, maxHeight: 440, overflowY: 'auto',
              background: colors.surface2, border: `1px solid ${LINE}`,
              borderRadius: radii.lg, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${LINE}` }}>
              <div style={{ fontFamily: DISP, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notifications</div>
              {unreadCount > 0 && (
                <motion.button whileTap={{ scale: 0.94 }} onClick={() => markAllRead(undefined)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: colors.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  <Check size={11} /> Mark all read
                </motion.button>
              )}
            </div>

            {/* List */}
            {notifications.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: text.tertiary, fontSize: '0.82rem' }}>
                <Bell size={24} color={text.tertiary} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div>No notifications yet</div>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifRow key={n.id} n={n} onRead={markOneRead} onNav={(path) => { setOpen(false); navigate(path); }} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
