import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, ArrowUpRight, Flame } from 'lucide-react';
import { POSITION_FILTERS } from '../lib/positions';
import { colors, type as t, radii } from '../lib/tokens';
import { easing, staggerDelay } from '../lib/motion';
import { Badge, EmptyState } from '../components/ui';

const DISP = t.font.display;

const POSITIONS = POSITION_FILTERS;
const GRAD_YEARS = ['All', '2025', '2026', '2027', '2028', '2029'];
const STATES = ['All', 'CA', 'TX', 'FL', 'NY', 'GA', 'OH', 'PA', 'IL', 'NC', 'AZ'];

const AVATAR_GRADS = [
  `linear-gradient(135deg,${colors.accent},${colors.accentText})`,
  'linear-gradient(135deg,#3a3a3a,#1c1c1c)',
  'linear-gradient(135deg,#2a2a2a,#161616)',
  'linear-gradient(135deg,#1e1e3a,#111)',
  'linear-gradient(135deg,#1a2a1a,#0f1a0f)',
  'linear-gradient(135deg,#2a1a1a,#1a0a0a)',
];

interface Athlete {
  id: number;
  name: string;
  position?: string;
  state?: string;
  gradYear?: number;
  school?: string;
  subscriptionTier?: string;
  hersRating?: number;
  profileImage?: string;
  offersCount?: number;
}

const css = `
  .explore-card{transition:transform .26s cubic-bezier(.25,1,.5,1),border-color .26s,box-shadow .26s}
  .explore-card:hover{transform:translateY(-4px);border-color:rgba(139,59,255,.32);
    box-shadow:0 20px 50px rgba(0,0,0,.5),0 0 0 1px rgba(139,59,255,.12)}
  .explore-card:hover .card-reveal{clip-path:inset(0 0% 0 0)}
  .card-reveal{clip-path:inset(0 100% 0 0);transition:clip-path .4s cubic-bezier(.25,1,.5,1);
    color:${colors.accent};position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .pill-filter{font-family:${DISP};font-weight:700;font-size:${t.size.sm};letter-spacing:.1em;text-transform:uppercase;
    padding:7px 14px;border-radius:${radii.full};cursor:pointer;border:1px solid rgba(255,255,255,.1);
    background:transparent;color:${colors.textSecondary};transition:all .2s cubic-bezier(.25,1,.5,1);white-space:nowrap;min-height:44px}
  .pill-filter:hover,.pill-filter.active{background:rgba(139,59,255,.12);border-color:rgba(139,59,255,.35);color:${colors.accent}}
  .search-input{background:${colors.surface1};border:1px solid ${colors.border};border-radius:${radii.full};
    color:${colors.textPrimary};font-family:${t.font.body};font-size:${t.size.md};padding:10px 44px 10px 40px;
    transition:border-color .2s,box-shadow .2s;width:100%}
  .search-input:focus{border-color:rgba(139,59,255,.4);box-shadow:0 0 0 3px rgba(139,59,255,.08)}
  .explore-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
  @media(max-width:640px){.explore-grid{grid-template-columns:repeat(2,1fr);gap:10px}}
  @media(max-width:380px){.explore-grid{grid-template-columns:1fr}}
  .filter-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}
  .filter-scroll::-webkit-scrollbar{display:none}
`;

export const Explore = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('All');
  const [gradYear, setGradYear] = useState('All');
  const [state, setState] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAthletes = useCallback(async (reset = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const offset = reset ? 0 : offsetRef.current;
    if (reset) { setLoading(true); setAthletes([]); offsetRef.current = 0; }
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '24', offset: String(offset) });
      if (position !== 'All') params.set('position', position);
      if (gradYear !== 'All') params.set('gradYear', gradYear);
      if (state !== 'All') params.set('state', state);

      const res = await fetch(`/api/athletes?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      const rows: Athlete[] = json.data || [];

      setAthletes(prev => reset ? rows : [...prev, ...rows]);
      offsetRef.current = offset + rows.length;
      setHasMore(rows.length === 24);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [position, gradYear, state]);

  // Re-fetch when filters change
  useEffect(() => { fetchAthletes(true); }, [fetchAthletes]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) fetchAthletes(false); },
      { threshold: 0.1 },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, fetchAthletes]);

  const filtered = search.trim()
    ? athletes.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) || a.school?.toLowerCase().includes(search.toLowerCase()))
    : athletes;

  const getAvatar = (a: Athlete, i: number) =>
    a.profileImage ? `url('${a.profileImage}')` : AVATAR_GRADS[i % AVATAR_GRADS.length];

  return (
    <div style={{ background: colors.surface0, minHeight: '100vh', color: colors.textPrimary, fontFamily: t.font.body }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.surface1, padding: '24px 28px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, letterSpacing: '.2em', fontSize: t.size.sm, color: colors.accent, textTransform: 'uppercase', marginBottom: 6 }}>
                Athlete Discovery
              </div>
              <h1 style={{ fontFamily: DISP, fontWeight: t.weight.bold, textTransform: 'uppercase', fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 0.92, margin: 0 }}>
                Explore The Grid
              </h1>
            </div>
            <div style={{ color: colors.textSecondary, fontSize: t.size.base, fontWeight: t.weight.semibold }}>
              <b style={{ color: colors.textPrimary }}>{athletes.length}</b> athletes loaded
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: 420, marginBottom: 16 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, pointerEvents: 'none' }} />
            <input
              className="search-input"
              placeholder="Search athletes or schools..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Position filter pills */}
          <div className="filter-scroll" style={{ marginBottom: 16 }}>
            {POSITIONS.map(pos => (
              <button key={pos} className={`pill-filter${position === pos ? ' active' : ''}`} onClick={() => setPosition(pos)}>
                {pos === 'All' ? 'All Positions' : pos}
              </button>
            ))}
            <button
              className="pill-filter"
              onClick={() => setFiltersOpen(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, borderColor: filtersOpen ? 'rgba(139,59,255,.35)' : undefined, color: filtersOpen ? colors.accent : undefined }}
            >
              <SlidersHorizontal size={12} /> More Filters
            </button>
          </div>

          {/* Expanded filters */}
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden', paddingBottom: 14 }}
            >
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, letterSpacing: '.12em', fontSize: t.size.xs, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Grad Year</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {GRAD_YEARS.map(y => (
                      <button key={y} className={`pill-filter${gradYear === y ? ' active' : ''}`} onClick={() => setGradYear(y)}>
                        {y === 'All' ? 'All Years' : `Class of ${y}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, letterSpacing: '.12em', fontSize: t.size.xs, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>State</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATES.map(s => (
                      <button key={s} className={`pill-filter${state === s ? ' active' : ''}`} onClick={() => setState(s)}>
                        {s === 'All' ? 'All States' : s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 48px' }}>
        {loading ? (
          <div className="explore-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ background: colors.surface1, border: `1px solid ${colors.border}`, borderRadius: radii.lg, height: 200, animation: 'pulse 1.6s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Athletes Found"
            body="Try adjusting your filters or search term."
          />
        ) : (
          <div className="explore-grid">
            {filtered.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: staggerDelay(i), ease: easing.standard }}
              >
                <Link to={`/profile/${a.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="explore-card" style={{
                    background: colors.surface1, border: `1px solid ${colors.border}`,
                    borderRadius: radii.lg, overflow: 'hidden', position: 'relative',
                  }}>
                    {/* Avatar top */}
                    <div style={{
                      height: 100, background: getAvatar(a, i),
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      position: 'relative',
                    }}>
                      {/* Rating badge */}
                      {(a.hersRating ?? 0) > 0 && (
                        <Badge
                          tone="accent"
                          style={{
                            position: 'absolute', top: 10, right: 10,
                            background: 'rgba(10,10,10,.75)', backdropFilter: 'blur(8px)',
                            border: `1px solid ${colors.borderStrong}`, borderRadius: radii.sm, padding: '4px 8px',
                            fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.lg,
                            color: colors.accent, lineHeight: 1, gap: 4,
                          }}
                        >
                          <Flame size={11} fill={colors.accent} color={colors.accent} />
                          {a.hersRating}
                        </Badge>
                      )}
                      {/* Pro tier indicator */}
                      {a.subscriptionTier && a.subscriptionTier !== 'free' && (
                        <div style={{
                          position: 'absolute', top: 10, left: 10,
                          background: colors.accent, color: colors.accentOn,
                          fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.xs, letterSpacing: '.1em',
                          textTransform: 'uppercase', padding: '3px 8px', borderRadius: radii.full, lineHeight: 1.3,
                        }}>{a.subscriptionTier}</div>
                      )}
                      {/* Hover CTA */}
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(139,59,255,.08)',
                        opacity: 0, transition: 'opacity .26s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }} className="card-hover-overlay">
                        <ArrowUpRight size={22} color={colors.accent} />
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '12px 14px 14px' }}>
                      <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.lg, textTransform: 'uppercase', letterSpacing: '.01em', lineHeight: 1.1, marginBottom: 4, color: colors.textPrimary }}>
                        {a.name}
                      </div>
                      <div style={{ fontFamily: DISP, fontWeight: t.weight.bold, fontSize: t.size.sm, letterSpacing: '.1em', textTransform: 'uppercase', color: colors.accent, marginBottom: 6 }}>
                        {[a.position, `'${String(a.gradYear || '').slice(-2)}`].filter(Boolean).join(' · ')}
                      </div>
                      {a.school && (
                        <div style={{ fontSize: t.size.sm, color: colors.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.school}
                        </div>
                      )}
                      {(a.offersCount ?? 0) > 0 && (
                        <div style={{ marginTop: 8, fontSize: t.size.xs, color: colors.textSecondary, fontWeight: t.weight.semibold }}>
                          <b style={{ color: colors.textPrimary }}>{a.offersCount}</b> offers
                        </div>
                      )}
                      {a.state && (
                        <div style={{ marginTop: a.offersCount ? 2 : 8, fontSize: t.size.xs, color: colors.textTertiary }}>{a.state}</div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: colors.textSecondary, fontFamily: DISP, fontWeight: t.weight.bold, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: t.size.base }}>
            Loading more athletes...
          </div>
        )}

        {!hasMore && athletes.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 32, color: colors.textTertiary, fontFamily: DISP, fontWeight: t.weight.bold, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: t.size.sm }}>
            All {athletes.length} athletes loaded
          </div>
        )}
      </div>
    </div>
  );
};
