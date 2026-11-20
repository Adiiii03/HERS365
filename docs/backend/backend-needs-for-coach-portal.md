# Backend Needs for the Coach Portal

What the coach portal needs from the backend/data side, and what already ships in the portal's own code.
Companion to the parent-portal backend doc. The portal's core (search, scouting board, roster, CSV,
messaging with the parent-approval gate, analytics counts) is already real and scoped per coach; the gaps
below are data pipelines, schema on prod, admin tooling, and infra.

## Data honesty: what a real coach sees today

"Dummy data" in this portal means two separate things:

1. **Demo content** (sample athletes, The Grid drops, card sample photos/headshots, the Analytics
   "Engagement Over Time" sample chart) is gated by `isDemoCoach()` on the client, which returns `false` on
   any non-development build. No coach on production, not even the demo account, sees it. Real coaches get
   honest empty states until the real backend lands.

2. **Derived stats.** The scouting cards historically showed height, weight, 40-yard, vertical, box-score,
   and a breakout score that `mapPlayerToScout` (`server/coachRoutes.ts`) computed from an athlete's rating
   and position, not from measurement. As of this portal pass, that fabrication is **gated to the demo
   coach only** (dev/test env, allowlisted email; fails closed in production). For every real coach,
   `/coach/players/search` and `/coach/player-clips` now return the **real value or `null`** for those
   fields, and the client renders `null` as "Not measured." A real coach never sees an invented measurement
   about a real athlete. Real identity, GPA, G5 rating, and offers pass through unchanged.

The remaining work is to feed those fields with real measured data so "Not measured" becomes a real number.

## Backend backlog (platform / data side)

- **A1: Real combine + box-score data pipeline (highest impact).** Ingest measured combine numbers into the
  existing `combineStats` table (`fortyDash`, `vertical`, `broadJump`, `shuttle` columns already exist) and
  stand up a real box-score source, then surface them through the coach endpoints. Schema exists; ingestion
  is the gap. Top credibility item for partner conversations (e.g. MaxPreps).
  - **Data contract to include with A1:** return a per-field flag (measured vs derived), or a parallel
    "verified" set, on the combine/height/weight fields on **both** the search and detail endpoints. This
    lets the client label precisely which values are measured once some athletes have real data and others
    don't, instead of an all-or-nothing treatment. It also reconciles today's gap where the detail endpoint
    (`/coach/players/:id`) returns `null` for height/weight/combine while search can return derived values.
- **A2: Real G5 five-part score.** Cards show the integer `g5Rating` today. The five-part G5 (athleticism,
  skill mastery, game IQ, leadership/coachability, competitive results) is a data/ML computation on the
  platform side. No invented decimal is shown.
- **A3: Detail/search field parity.** Minor; folds into A1's per-field flag and goes away once A1 lands.
- **A4: Engagement Over Time series.** The Analytics "Engagement Over Time" chart has no backing pipeline;
  it shows a dev-only sample and an honest "coming soon" for real coaches. Needs a real time series (likely
  from `coachEvents` plus athlete-side clip/profile engagement).
- **A5: Clip view/like counts.** `/coach/player-clips` has no view/like counts (dashboard shows 0). Not
  stored.
- **A6: Notification preferences + real notifications.** Settings toggles and the header bell are
  local-only; no table/endpoint backs them.
- **A7: Coach verification admin workflow + approval email.** The `requireVerifiedCoach` gate is enforced;
  the admin review tooling and the "you're approved" email are out of scope for the portal's own code.
- **A8: "Committed" status model.** The prospect tier enum is `top-target | watching | offered` with no
  `committed`. This is why a roster "Committed" reads back as "Offered" and analytics reports `committed: 0`.
  A small schema/enum decision unblocks both.
- **A9: Realtime messaging.** Messages polls every ~8 seconds and typing indicators are stubbed. Typing
  indicators / read receipts / websockets are a backend piece; polling works in the interim.
- **A10: Coach Grid feed endpoint.** The coach Grid page is demo-only until a real `GET /coach/grid-feed`
  exists, built over the existing highlights/board tables. The page stays sample-only (dev-gated, fails
  closed in prod) until it lands.
- **A11: Prod migrations + deploy** for anything above that touches schema.

## Already solid (no backend work needed)

Player search + filters, scouting board (save/tier/notes/remove), roster persistence + CSV export,
messaging with the parent-approval safeguarding gate + moderation + rate limit, analytics core counts, the
verification gate, and parent-controlled `coachDiscoverable` hiding. The coach portal's APIs are more
complete than missing; the shipped portal pass addressed frontend consistency and the derived-data honesty
issue above.
