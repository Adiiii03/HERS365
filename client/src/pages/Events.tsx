import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, Flame,
  CheckCircle2, Clock, ChevronRight, Trophy,
} from 'lucide-react';
import { colors, type as t, radii } from '../lib/tokens';
import { Badge } from '../components/ui';

const DISP = t.font.display;

type EventType = 'Tournament' | 'Camp' | '7v7' | 'Combine' | 'Showcase';

type EventItem = {
  id: number;
  title: string;
  org: string;
  type: EventType;
  date: string;
  city: string;
  state: string;
  cost: string;
  spots: number | null;
  spotsLeft: number | null;
  registered: boolean;
  featured: boolean;
  desc: string;
};

type ApiEvent = {
  id: number;
  name: string;
  date: string;
  location: string;
  registrationDeadline: string | null;
  participantCount: number;
  capacity: number;
  price: number;
  description: string | null;
  upcoming: boolean;
  org?: string;
  type?: string;
  city?: string;
  state?: string;
  featured?: boolean;
};

function mapApiEvent(e: ApiEvent, registeredIds: Set<number>): EventItem {
  const locationParts = e.location.split(',').map((s) => s.trim());
  const city = e.city ?? locationParts[0] ?? '';
  const state = e.state ?? locationParts[1] ?? '';
  const spotsLeft = e.capacity > 0 ? Math.max(0, e.capacity - e.participantCount) : null;
  const cost = e.price === 0 ? 'Free' : `$${(e.price / 100).toFixed(0)}`;
  const rawType = (e.type ?? 'Showcase') as string;
  const validTypes: EventType[] = ['Tournament', 'Camp', '7v7', 'Combine', 'Showcase'];
  const type: EventType = validTypes.includes(rawType as EventType)
    ? (rawType as EventType)
    : 'Showcase';

  return {
    id: e.id,
    title: e.name,
    org: e.org ?? 'HERS365',
    type,
    date: e.date,
    city,
    state,
    cost,
    spots: e.capacity > 0 ? e.capacity : null,
    spotsLeft,
    registered: registeredIds.has(e.id),
    featured: e.featured ?? false,
    desc: e.description ?? '',
  };
}

const TYPES = ['All', 'Tournament', 'Camp', '7v7', 'Combine', 'Showcase'] as const;

// Spots-left urgency reads as a semantic status: scarce = danger, tight = pink
// attention, plenty = success. null (uncapped) shows no urgency color.
function urgencyColor(left: number | null): string | null {
  if (left === null) return null;
  if (left <= 10) return colors.danger;
  if (left <= 25) return colors.pink;
  return colors.success;
}

function EventCard({ ev, onRegister }: { ev: EventItem; onRegister: () => void }) {
  const urg = urgencyColor(ev.spotsLeft);

  return (
    <motion.div
      className="k-card-hover"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      style={{ padding: '18px 20px', marginBottom: 12 }}
    >
      {ev.featured && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, color: colors.accent }}>
          <Flame size={11} />
          <span style={{ fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Featured Event</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: DISP, fontSize: t.size.lg, fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.01em', color: colors.textPrimary }}>{ev.title}</span>
            <Badge tone="accent">{ev.type}</Badge>
          </div>
          <div style={{ fontSize: t.size.sm, color: colors.textTertiary, marginBottom: 10 }}>{ev.org}</div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.textSecondary }}>
              <Calendar size={12} />
              <span style={{ fontSize: t.size.base, fontWeight: t.weight.semibold }}>{ev.date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.textSecondary }}>
              <MapPin size={12} />
              <span style={{ fontSize: t.size.base, fontWeight: t.weight.semibold }}>{ev.city}, {ev.state}</span>
            </div>
            {ev.spotsLeft !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} color={urg || colors.textSecondary} />
                <span style={{ fontSize: t.size.base, fontWeight: t.weight.bold, color: urg || colors.textSecondary }}>{ev.spotsLeft} spots left</span>
              </div>
            )}
          </div>

          <p style={{ fontSize: t.size.base, color: colors.textSecondary, margin: '0 0 14px', lineHeight: 1.5 }}>{ev.desc}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: t.size.base, fontWeight: t.weight.bold, color: colors.textPrimary }}>{ev.cost}</span>
              {ev.spots && <span style={{ fontSize: t.size.xs, color: colors.textTertiary }}>· {ev.spots} total spots</span>}
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onRegister}
              style={{
                padding: '10px 18px', minHeight: 44, borderRadius: radii.sm, border: 'none',
                background: ev.registered ? `${colors.success}1f` : colors.accent,
                color: ev.registered ? colors.success : colors.accentOn,
                fontSize: t.size.sm, fontWeight: t.weight.bold, letterSpacing: '0.04em',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {ev.registered
                ? <><CheckCircle2 size={13} /> Registered</>
                : <><ChevronRight size={13} /> Register</>}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [registeredIds, setRegisteredIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch('/api/events')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load events (${r.status})`);
        return r.json() as Promise<ApiEvent[]>;
      })
      .then((data) => {
        setEvents(data.map((e) => mapApiEvent(e, registeredIds)));
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  // registeredIds intentionally omitted — only runs on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async (id: number) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}') as { id?: number };
    const playerId = user.id;

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, playerId }),
      });

      if (!res.ok) {
        const body = await res.json() as { message?: string };
        if (res.status === 400 && body.message === 'Already registered for this event') {
          // treat as registered
        } else {
          console.error('Registration failed:', body.message);
          return;
        }
      }

      setRegisteredIds((prev) => new Set([...prev, id]));
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, registered: true, spotsLeft: e.spotsLeft !== null ? Math.max(0, e.spotsLeft - 1) : null }
            : e
        )
      );
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  const filtered = typeFilter === 'All' ? events : events.filter((e) => e.type === typeFilter);
  const registeredCount = events.filter((e) => e.registered).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 120px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.accent }}>
          <Trophy size={13} /> EVENTS
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: t.weight.bold, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Get On The Field.
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: t.size.md, margin: 0 }}>
          Tournaments, camps, showcases, and combines. Where scouts are watching.
        </p>
      </div>

      {registeredCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${colors.success}1a`, border: `1px solid ${colors.success}33`, borderRadius: radii.full, padding: '5px 12px', marginBottom: 20, fontSize: t.size.sm, fontWeight: t.weight.bold, color: colors.success }}>
          <CheckCircle2 size={13} /> {registeredCount} event{registeredCount !== 1 ? 's' : ''} registered
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {TYPES.map((type) => (
          <motion.button key={type} whileTap={{ scale: 0.94 }} onClick={() => setTypeFilter(type)}
            style={{ padding: '10px 18px', minHeight: 44, borderRadius: radii.pill, border: 'none', background: typeFilter === type ? colors.accent : 'rgba(255,255,255,0.05)', color: typeFilter === type ? colors.accentOn : colors.textSecondary, fontSize: t.size.sm, fontWeight: t.weight.bold, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
            {type}
          </motion.button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, padding: '14px 18px', background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.md }}>
        {[
          { icon: <Calendar size={14} />, val: events.length, label: 'Events' },
          { icon: <Clock size={14} />, val: events.filter((e) => e.spotsLeft !== null && e.spotsLeft <= 20).length, label: 'Filling Fast' },
          { icon: <Trophy size={14} />, val: registeredCount, label: 'Registered' },
        ].map((s, i) => {
          const highlight = i === 2 && registeredCount > 0;
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: highlight ? colors.success : colors.textTertiary }}>{s.icon}</div>
              <div style={{ fontFamily: DISP, fontSize: t.size.xl, fontWeight: t.weight.bold, color: highlight ? colors.success : colors.accent, letterSpacing: '-0.02em' }}>{s.val}</div>
              <div style={{ fontSize: t.size.xs, color: colors.textTertiary, fontWeight: t.weight.bold, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textSecondary, fontSize: t.size.base }}>
          Loading events...
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.dangerText, fontSize: t.size.base }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textSecondary, fontSize: t.size.base }}>
          No events match this filter.
        </div>
      )}

      <AnimatePresence>
        {!loading && !error && filtered.map((ev) => (
          <EventCard key={ev.id} ev={ev} onRegister={() => register(ev.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};
