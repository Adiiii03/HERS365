# Parent Portal — Backend Needs

Backend status for the parent/guardian portal: what is implemented in this PR, and what still requires
production infrastructure or secrets. The portal is a minor-athlete data surface, so every item is
parent-scoped (a parent only ever reads their own linked children via `getChildIds`), no payments are
wired without a real provider, and no feature presents a safety guarantee the backend does not enforce.

## Status

The parent portal frontend is complete (7 pages). The safe, code-only backend pieces are included in
this PR. Everywhere the backend does not exist yet, the UI renders honest empty / "not connected yet"
states rather than fabricated data. The remaining work needs production infrastructure or secret keys
(Stripe, AWS S3/CloudFront, Resend, etc.) that are not available in local dev.

All new parent routes live in `server/api/parent.ts` (mounted at `/api/parent`, see `app.ts`).

## Implemented in this PR

- **Widened `GET /api/parent/children`.** Returns the athlete fields the portal needs (profile photo,
  diamond rating, offers count, GPA, height/weight, city, verification status, profile-completeness),
  all from `players`, parent-scoped. Deliberately returns **no** minor phone, DOB, email, or zip — only
  recruiting-relevant fields.
- **Decimal HERS score** on that read, from `athleteRankings.overallScore` (left-joined, null-safe).
  Note: `server/seed.ts` does not populate `overallScore`, so parents see the integer star rating
  (`players.g5Rating`) fallback until a ranking carries a real score. Seeding `overallScore` makes the
  decimal demoable.
- **Profile-completeness %**, derived from filled `players` fields on the `/children` read.
- **Athlete change-request model.** New table `athlete_change_requests` (migration
  `server/migrations/0018_solid_robin_chapel.sql`, additive, non-destructive) plus
  `GET /api/parent/change-requests` and `POST /api/parent/change-requests/:id/respond`. On approve it
  writes only a tight allowlist (`school`, `profileImage`); everything else is recorded, not auto-applied.
  Status/consent are never touched here.
- **Parent profile endpoint.** `GET|PUT /api/parent/profile` (name and phone). Email is intentionally
  excluded: it is the unique login id and changing it needs a re-verify email (Resend), which is backend
  infra work below.

Tests for the above: `server/test/parentPortalWiring.test.ts`.

## Safety note — athlete edits currently bypass the approval flow

Today an athlete can change their own profile fields (photo, school, GPA, visibility) directly and
immediately via `PUT /api/athletes/:id` (`server/api/athletes.ts:312-344`, owner-check only, no parent
gate) and `PUT /api/users/profile` (`server/api/users.ts`). The parent "Profile Change Requests" approval
UI is therefore inert (no athlete-side path creates requests) **and** bypassed (direct edits never pass
through it). Until an athlete submit-path routes those edits through `athlete_change_requests`, parent
approval does not actually gate anything. This needs a product/safety decision before the approval
feature is presented to parents as live. Whoever builds the submit side must also add `field`/`kind`
validation on insert, since the apply-time allowlist is the only gate today.

## Still needed (requires infrastructure or secrets, not in this PR)

Grouped by surface, with risk:

- **Billing / parent-as-payer** (HIGH). Stripe keys + webhooks. A full Stripe system exists
  (`paymentRouter`, `paymentRoutes.ts`) but every player-scoped route is gated by `canAccessPlayer`, so a
  parent gets 403; routes also 503 without Stripe keys. Needs the parent-as-payer product decision, then
  either extending `canAccessPlayer` to honor `parentChildRelations` or a parent-scoped billing read.
  Card capture must use Stripe Checkout/Elements, never raw card numbers to the API.
- **Guardian / consent read + privacy enforcement** (HIGH — COPPA/consent). The guardian system is real
  and mounted (`guardianRouter`: `/api/auth/guardian/verify|resend|status`, writes `guardianConsents`,
  flips `parentChildRelations.status`, sets `players.status='active'` with an audit chain). Missing: a
  logged-in-parent read of guardian/consent status for the portal's Guardian Gate card, and consent
  detail/withdraw. Separately, `PUT /api/parent/settings` already propagates two keys to every linked
  child — `profileVisibility` → `players.coachDiscoverable` and `rankingVisibility` →
  `players.rankingVisible` (enforced in `coachRoutes.ts` and `rankingRoutes.ts`) — but the other 6
  Privacy toggles persist to `parents.preferences` and are **not enforced** by any backend path yet. The
  UI marks them "Saved, not enforced yet"; real enforcement (message gating, contact approval, feed/photo
  visibility) is still needed.
- **Media uploads.** Profile-photo and game-film uploads need the S3 buckets + CloudFront (photos and
  film are separate) + AWS keys. Upload is gated behind guardian verification + activation and is off by
  default (`MEDIA_UPLOAD_ENABLED`).
- **Account actions.** Password reset needs Resend; 2FA, data export, and banking need their own backends
  (banking is Stripe-based and safety-sensitive).
- **Metrics.** Coach Views / Film Views can aggregate the existing `profileViews` table. "Schools
  Following" has no table yet and needs a source.
- **The Grid feed.** No parent feed router is mounted. Decide between reusing the app feed scoped to the
  parent's children (via `getChildIds`) or a new parent-only feed table (data-scope + minor-privacy
  decision).
- **Content stores with no schema.** Films/highlights store + parent read, schedule/games store, and
  academics beyond `players.gpa` (SAT/ACT/class rank/NCAA eligibility) have no columns today.

## Product decisions to settle

Parent-as-payer model; the stat review model (`parentStatSubmissions` is admin-reviewed, not parent
approve/deny); what "Hide Statistics" should mean; the academics fields to store; the authoritative
HERS-score source (recommended: `athleteRankings.overallScore`, not the parent-entered
`parentStatSubmissions.hersRating`); and where "Schools Following" comes from.

## Suggested order (biggest payoff, lowest risk first)

1. Widened `/children` + HERS score — the most visible real data across three pages, low risk. **Done in
   this PR.**
2. Metrics + completeness (finishes the Dashboard stat row). Completeness done; Coach/Film Views + Schools
   Following remain.
3. Privacy enforcement and guardian/consent read — the real minor-safety surfaces; each is HIGH risk, do
   carefully.
4. Change-request model, feed source, content stores — unblock the remaining demo sections once the data
   models are decided (the change-request table ships in this PR; the athlete submit-path and the safety
   decision above are still open).
5. Billing last — highest risk, needs the parent-as-payer product decision before any code.
