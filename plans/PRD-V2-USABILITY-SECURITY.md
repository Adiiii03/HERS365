# HERS365 v2 PRD: Guardian Gated Registration, Pre Launch Lockdown, Security Hardening, and Purple/Pink/Neon Rebrand

## 1. Title, mission, and ownership

**Mission.** Take HERS365 from an open, recruiting framed athlete app to a safe, parent paid community for underage girls who play flag football. This rollout does four things at once: it locks the public site behind a "registration coming soon" marketing gate with newsletter capture and a Contact Jonte path, it ships a guardian gated registration flow so no minor account activates until a real adult guardian both confirms a code and establishes a password backed account of record, it hardens the deployed backend to an award winning security bar for a minors platform (verifiable parental consent, a tamper evident audit trail, revocable sessions, correct proxy aware rate limiting behind Railway, hardened and gated media), and it rebrands the accent system from a single orange to a governed three color system (purple primary, hot pink energy, neon green high signal). The dark neutral ramp stays exactly as is.

**Who executes.** The coding agent Fable 5 implements this end to end against the real repo at `/Users/samueladu/HERS365`.

**Who reviews.** Samuel (tech lead) reviews every workstream against the acceptance criteria in section 12 and the verification plan in section 13.

**Executable contract.** Every requirement below names real files, real columns, real endpoints, a migration number, and a verifiable check. Do not invent structure that contradicts the current state in section 2.

---

## 2. Current state (do not rebuild what exists)

**Stack and entrypoints.** Client is React 19 plus Vite plus Capacitor (iOS) at `client/`. Server is Express plus Drizzle ORM plus Postgres at `server/`. The deployed backend is `server/core-server.ts` which boots `server/app.ts` (`createApp`). `server/index.ts` (the Azure, `express-session`, compliance service entrypoint) is NOT deployed and crashes locally, so nothing in `index.ts` protects production. Local dev is `npm run dev:core`. CI gate is `npx tsc --noEmit`. Deploy is Vercel (frontend) plus Railway (backend). Most server files carry `@ts-nocheck`, so `tsc` will NOT catch a bad column reference; migrations must be run against the local DB to verify.

**Identity is four separate tables, not unified.** There is no `users` table. Accounts live in `players` (the athletes), `parents`, `coaches`, `admin_users`, each with its own id, email, passwordHash. JWT carries `{ userId, role }` with role `athlete | parent | coach | admin`. Cross table references use the `(userId int, userType text)` pair, not foreign keys.

**Auth today.** Two auth routers both mount under `/api/auth`: `server/authRoutes.ts` at `/api/auth` and `/api/auth/secure` (`app.ts:73` to `74`), and `server/emailAuthRoutes.ts` at `/api/auth/email` (`app.ts:75`). Auth is stateless JWT Bearer only via `server/middleware/requireAuth.ts`; the deployed `app.ts` mounts no session. The client (`client/src/pages/Auth.tsx`) posts signup to `/api/auth/register`, login to `/api/auth/login`, Google to `/api/auth/google`, so the live path is `authRoutes.ts`, not `emailAuthRoutes.ts`. Confirmed in `server/auth.ts`: the signed token payload today includes `userId`, `email`, `role`, and `name` (`auth.ts:29` to `32`), and `JWT_EXPIRES` defaults to `7d`.

**What already exists and must be reused, not rebuilt:**
- Registration kill switch. `server/lib/registration.ts` `isRegistrationEnabled()` returns true only when `process.env.REGISTRATION_ENABLED === 'true'` (fail closed, read per request). Enforced server side on every create path: `authRoutes.ts:126`, `authRoutes.ts:266` (coach), `authRoutes.ts:332` (google new user), `emailAuthRoutes.ts:73`; each returns 403 "Registration is currently closed." Client mirrors via `import.meta.env.VITE_REGISTRATION_ENABLED` (`Auth.tsx:154`). Covered by `server/test/registrationClosed.test.ts`.
- COPPA age gate. `server/lib/athleteGate.ts` `validateAthleteSignup(dob, parentEmail)` blocks under 13 self signup, requires a guardian email for under 18, and treats the server as source of truth for dob.
- Parent gated messaging (correct and well built, keep it). `server/api/messages.ts` requires `requireAuth` plus `requireVerifiedCoach`, then enforces `hasParentApprovedLink` (message_request status approved AND `parentId` set) before block checks, before `moderateMessage`, before DB insert (`messages.ts:156` to `215`). `parentId` can only be written by an actual parent via `server/api/parent.ts` `/requests/:id/respond` (`parent.ts:133` to `175`); the athlete or coach respond route provably never sets `parentId` (`messages.ts:347` to `351`). Bidirectional blocks via `messageBlocks.eitherBlocked`.
- Text moderation. `server/lib/moderation.ts` uses Claude Haiku 4.5 with a minor safeguarding rubric and prompt injection defense, and fails closed unless the environment is positively development or test. Images and video are not scanned.
- Parent linkage tables. `parents` (`schema.ts:240` to `251`) and `parent_child_relations` (`schema.ts:254` to `260`). Athlete signup inserts `players.pendingParentEmail` (`schema.ts:38`) and, if a parent account already exists, writes a `parent_child_relations` row with `relationship='pending'` (`authRoutes.ts:193` to `204`).
- Parent dashboard (partially built). `client/src/pages/ParentDashboard.tsx` plus `server/api/parent.ts` (`/children`, `/requests`, `/activity`, `/settings`, `/invite-athlete`). This is the safety surface; do not rebuild it, wire and guard it.
- Email senders. `server/email.ts` has `sendEmail`, `sendVerificationEmail`, `sendPasswordResetEmail`, `sendWelcomeEmail`.
- PII discipline. `server/lib/playerPrivacy.ts` `PII_FIELDS` strips email, phone, dob, zipCode, pendingParentEmail, passwordHash from public views.
- Stripe paying parent. The parent is the paying Stripe customer and the gate for all coach contact; this rollout uses that adult account as the identity anchor for guardian consent (section 6), not merely form data.

**Prototype reference and the calendar flow.** The meeting named one reference: `https://her365.sketchplay.io/calendar`. A repo scan for `sketchplay` returns zero matches, so the prototype lives only outside this codebase. Treat it exactly as the meeting framed it: a reference for what the product does, NOT a quality bar to copy. Scope decision for this rollout: the prototype shows a calendar and a per event registration flow, and this rollout touches EVENT registration only through the same `REGISTRATION_ENABLED` gate and the tap target work in D4. The existing in app calendar and event code (`client/src/pages/Events.tsx`) is otherwise untouched by this rollout beyond accessibility sizing. Whether per event RSVP itself becomes guardian gated (so a girl can only be signed up for a specific event through her guardian) is scoped in A5 and deferred as a distinct decision, so a reader never conflates account registration with event registration.

**What does NOT exist and this rollout must build:**
- No account activation gate. Athlete `/register` returns a usable 201 JWT immediately (`authRoutes.ts:211` to `212`); `players` has no status or activatedAt column; there is no "pending until guardian confirms" state.
- No guardian consent code storage or verification endpoint. `pendingParentEmail` is a bare string with no code, TTL, attempt counter, or table.
- Email verification and password reset tokens live in per process in memory JS Maps (`emailAuthRoutes.ts:188` to `192`, comment "swap for DB table in production"), lost on restart, not shared across Railway instances, reset tokens stored in plaintext.
- No SMS infrastructure anywhere. `players.phone` and `parents.phone` exist but are unused for verification.
- No persisted consent. The `ConsentRecord` interface (`server/compliance-types.ts:195` to `217`) is backed by nothing; `/api/consent` handlers are stubs that run only under the non deployed `index.ts`.
- No newsletter or subscribers table or concept.
- No pre launch public state. When registration is closed the client only hides the signup tab; there is no coming soon page, no newsletter, no Contact Jonte.
- No custom domain. Still `hers365.vercel.app`; iOS universal links are pinned to that host (`DEPLOYMENT.md` lines 102 and 137).
- Security gaps in the deployed path: no `trust proxy` (all IP keyed limiters bucket every client under the Railway proxy IP) and all `express-rate-limit` instances use the default per process in memory store (defeated across Railway instances); logout revocation is a no op without Redis (`redis.ts:99` to `114` fail open, `JWT_EXPIRES` default `7d`); uploads are public read with non crypto keys and no server side encryption and no upload activation gate; no audit log for consent, safeguarding, or admin PII access; JWT payload carries a minor's email and name in plaintext; and register leaks account existence via a distinct 409 message (`emailAuthRoutes.ts:104` to `106`).

**Accent system today (three disconnected sources plus literals).** CSS vars in `client/src/index.css:25` to `28` and `41` (`--accent:#FF5A2D`), a Tailwind `coral` scale in `client/tailwind.config.js:10` to `21`, and JS constants `FLAME`/`FLAME_SOFT` in `client/src/lib/theme.ts:3` to `4`, plus roughly 790 accent references touching 66 files. That 790 is NOT all raw literals: it is 386 raw orange hex literals across 59 files (`ff5a2d` alone is 165, verified) that E5 rewrites, plus the `FLAME`/`FLAME_SOFT` constant references E4 flips by changing the two constant values, plus the `coral-*` utility classes E3 remaps in one edit. Editing `--accent` alone rebrands almost nothing because only 2 sites consume `var(--accent)` exactly (11 across the whole `var(--accent*)` family, some in the dead `App.css` that E6 deletes). The dark ramp in `index.css:16` to `23` already matches the target spec exactly.

**Product framing conflict.** `README.md` markets a recruiting platform; `/Users/samueladu/HERS365/CLAUDE.md` defines the safety first, parent gated community. This PRD leads with the safety first framing; the recruiting language is legacy positioning to soften.

---

## 3. Goals and non goals

### Goals for THIS rollout
1. Public site is locked behind a marketing gate while `REGISTRATION_ENABLED` is false: a real "registration coming soon" landing with newsletter capture and a Contact Jonte path. The live recruiting landing, the signup and onboarding flows, and any reachable per event registration are not open until launch.
2. Guardian gated registration: a girl supplies her email plus a guardian email (and optionally a guardian phone); the guardian receives a code, opens a single use link, enters the code, and establishes a password backed adult account of record; only then does the girl's account activate. Every participant is matched to a real adult guardian, not to a bare inbox.
3. Durable, peppered, attempt limited, expiring verification codes backing both email and SMS channels, replacing the in memory Maps.
4. A real persisted parental consent record plus a tamper evident, append only consent audit log on the deployed path.
5. Security hardening to an award winning bar: correct proxy aware rate limiting on a shared store, revocable sessions with reuse detection, account enumeration defense, secrets and env assertions, code anti brute force, cookie hardening, hardened and gated uploads, admin PII access auditing, and a minor data deletion lifecycle.
6. Usability and accessibility to WCAG AA for young girls and their parents: age gate and consent step in signup, a pending screen and a guardian code entry page, parent facing navigation and route guards, real copy, correct tap targets, restored pinch zoom, and higher contrast.
7. Visual rebrand to the governed purple, hot pink, neon green system with AA verified contrast.
8. Domain and hosting decisions captured as action items with the iOS universal links dependency noted.

### Non goals for THIS rollout (see section 15)
- ID matching that verifies every submitted ID against participant info.
- Automated secure Dropbox or cloud document storage per participant. Full antivirus, perceptual hash CSAM matching, and image or video content scanning of media are V2; because that scanning is V2, minor media upload ships OFF at launch (section 7).
- Event check in verification (Option 2).
- Advanced parent dashboard and participant management beyond guarding and shelling the existing dashboard.
- The AWS 50k user infrastructure in `docs/50K-USER-INFRASTRUCTURE.md`. This rollout targets the current Vercel plus Railway stack; that AWS plan is explicitly future.
- SMS is scoped and wired but shipping it depends on the provider decision in section 16; email guardian code is launch critical, SMS is fast follow if the provider is not chosen in time.

---

## 4. Users and principles

**Users.** Underage girl flag football athletes (13 and older self register; under 13 is out of scope for self signup and stays blocked). Parents and guardians, who are the paying customer via Stripe and the gate for all coach contact. Coaches, created unverified and admin approved. Admins.

**Principles.**
- Safety is a feature, not a setting. No coach to athlete contact, and no active minor account, without a verified adult guardian in the loop.
- The guardian is the gate, not inert form data and not a bare inbox. A guardian is a verified adult of record with a password backed account who explicitly consents; the girl's account cannot go active on her say so alone, and a code that only proves control of an inbox is never sufficient by itself.
- Data minimization for minors. Never expose a minor's email, phone, dob, location, photo, or film without auth and the right relationship. Keep minor PII out of tokens and public views, and do not collect fields the product does not need (section 7, FERPA).
- Fail closed. Every gate defaults to denied when config is missing or a dependency is down, mirroring the existing kill switch.
- Reading level and tone fit a young girl. Plain language, no recruiting pressure aimed at minors, no dark patterns.
- Everything auditable and tamper evident. Consent grants, revocations, moderation blocks, and admin PII access leave an immutable trail that the application role cannot rewrite.

---

## 5. Workstream A: Pre launch lockdown and marketing gate

**Intent.** While `REGISTRATION_ENABLED` is false, the public root shows a safe, parent facing "registration coming soon" experience that captures interest and routes people to Jonte, instead of dead ending on a login only page.

### A1. Coming soon public root
- New page `client/src/pages/ComingSoon.tsx`. Leads with the parent facing safe community value proposition (parents in control, all coach contact gated, built for underage girls who play flag football), a newsletter email capture, a "Contact Jonte" action, and a short "what is coming" note. No live recruiting claims, no fabricated live ticker or fake stats.
- In `client/src/App.tsx`, when `import.meta.env.VITE_REGISTRATION_ENABLED !== 'true'`, route `/` and `/landing` to `ComingSoon`, and make the current `LandingPage` and `/auth?tab=signup` unreachable (redirect signup attempts to `ComingSoon`). When the flag is true, restore the normal landing and auth routes. This is a build time flag mirroring the existing pattern at `Auth.tsx:154`.

### A2. Newsletter capture (double opt in)
- New router `server/api/newsletter.ts` mounted in `server/app.ts`. `POST /api/newsletter/subscribe { email, name?, source }` writes a `newsletter_subscribers` row (section 10) with `status='pending'`, a generated `confirm_token` and `unsubscribe_token`, then sends a confirmation email via a new `sendNewsletterConfirm` in `server/email.ts`. It returns a generic success regardless of whether the email already exists (no enumeration).
- Double opt in is required because this is a minors adjacent parent list and the send path must not be weaponizable. `GET /api/newsletter/confirm?token=` flips `status` from `pending` to `subscribed`, sets `confirmed_at`, and sends a plain `sendNewsletterWelcome`. `GET /api/newsletter/unsubscribe?token=` flips status to `unsubscribed` and sets `unsubscribed_at`. Only `subscribed` rows are ever mailed beyond the single confirmation.
- Abuse controls (section 7): the subscribe endpoint is Zod validated via `server/middleware/validate.ts`, rate limited on the shared store, and capped per destination email and per source IP so it cannot be used to bomb a victim inbox with confirmation mail.
- Reuse the existing `POST /api/contact` pattern behind `Contact.tsx` for "Contact Jonte"; no new contact backend is required, only the CTA and copy.

### A3. Kill switch wiring and docs
- Confirm `REGISTRATION_ENABLED` remains unset or false in production and `VITE_REGISTRATION_ENABLED` is false in the Vercel build so the coming soon gate is the default. Extend `server/test/registrationClosed.test.ts` to assert the newsletter endpoints stay open while all create paths return 403.

### A4. Domain and hosting notes (action items, not code)
- Priority 1: purchase the custom domain (Samuel decision, section 16). Note the downstream cost: iOS universal links are pinned to `hers365.vercel.app` in `DEPLOYMENT.md` lines 102 and 137, so a domain switch requires updating `applinks` and `webcredentials` and `client/vercel.json`.
- Priority 2: hosting is already production on Vercel plus Railway. This PRD reads the meeting action item "move the website onto a production server" as already satisfied by that deploy, but that reinterpretation is not silently closed: it is raised back to Jonte and Richard as an explicit open question in section 16. The concrete open item on our side is confirming Railway plus Vercel as the chosen target and provisioning Redis (section 7), not the AWS plan in `docs/50K-USER-INFRASTRUCTURE.md`.

### A5. Event registration scope while locked
- The coming soon gate above covers account signup and onboarding. Per event registration (the RSVP flow the prototype calendar shows) must also be unreachable to the public while `REGISTRATION_ENABLED` is false: any route that creates an event registration is placed behind the same build time flag and, on the server, behind the kill switch and `requireActivated` (section 6). For this rollout, event RSVP is not a public surface. Whether an activated girl can be signed up for a specific event only through her guardian (event level guardian gating, distinct from account level) is deferred to V2 (section 15) and flagged for Jonte in section 16, so "registration" is never ambiguous between account creation and event RSVP.

---

## 6. Workstream B: Guardian gated registration and verification

**Intent (meeting Option 1, preferred, hardened).** Suzy enters her email and a guardian email; the guardian receives a confirmation code and a single use link; the guardian opens the link, enters the code, and establishes a password backed adult account of record; only after that does Suzy's account activate. Purpose: confirm real adult guardian approval and match each participant to a verifiable adult, not to whoever happens to control an inbox.

### B1. The new flow and states
1. Girl submits athlete signup with: her email, a password (or Google), name, dob, guardian email (required for all athletes now, not only under 18), guardian phone (optional).
2. Server validates via extended `validateAthleteSignup` (still blocks under 13, still server authoritative on dob) AND rejects the signup when the guardian email normalizes to the girl's own email; it records a same registrable domain match as a flag in code metadata for later review. It then creates the `players` row with `status='pending_guardian'`, `activated_at=NULL`, and a fresh unguessable `pending_token`; links or creates the `parent_child_relations` row with `status='pending'` (stop overloading `relationship` with the string 'pending'); and issues a strong code stored as a keyed hash in `guardian_verification_codes` (channel email, purpose link_consent) together with a single use opaque `link_token`. The girl's signup IP and user agent are stored in the code row metadata for the self approval check in step 5. The code and link are dispatched to the guardian email.
3. Server returns 202 with `{ status: 'pending_guardian', pendingToken, guardianEmailMasked }` and NO token. The girl sees a "waiting for your grown up to say yes" pending screen. No raw `playerId` is returned to the client; the pending screen advances only via `pendingToken`.
4. Guardian opens the email and clicks the link, which carries the opaque single use `link_token` (never a raw `playerId`), and lands on the guardian verify page. The guardian enters the code AND establishes an adult identity of record: either signs in to an existing verified `parents` account, or creates a `parents` account with a password (that account's `email_verified` is set true by this same code). A bare code click alone never activates a minor.
5. On a correct, unexpired, unused, under attempt limit code with an established adult parent account: set `players.status='active'` and `activated_at=now()`, set `parent_child_relations.status='verified'`, `verified_at`, and `consent_id`; write a `guardian_consents` row (`consent_type='parental'`, `method='email_code'`, guardian IP and user agent recorded, `framework` set to the actually applicable basis per section 7, not hardcoded); write `consent_audit_log` rows (`code_verified`, `granted`, `link_created`); and mark the code used and the `link_token` consumed. If the guardian IP or user agent matches the girl's stored signup IP or user agent, set `metadata.self_approval_suspected=true` on the consent row and write an audit row for admin review, but still allow activation (the parent account and password are the primary binding; this is a flag, not a hard block). The activation flip is additionally enforced at the database layer by a trigger (section 10) so no code path can set `active` without a linked verified consent. The girl can now log in; the girl's token is never returned to whoever holds the guardian link.
6. Post activation login by path: an email and password athlete logs in with the password she set; a Google athlete re authenticates through Google. Either way the issued JWT carries only `userId` and `role` (section 7).
7. If the guardian phone was supplied and SMS is enabled, an optional phone verify step runs the same code machinery over channel sms (with the toll fraud controls in section 7) before or after email; the guardian consent record notes both channels.

### B2. Close all registration paths (no bypass)
- Add a shared module `server/lib/guardianRegistration.ts` exporting `createPendingAthlete(input)` that does the pending insert, the self email rejection, the link, the code issue, and the dispatch. Call it from all three athlete create paths: `authRoutes.ts` `/register` (line 125), `authRoutes.ts` `/google` new athlete branch (line 307), and `emailAuthRoutes.ts` `/register` (line 72). This makes the gate impossible to bypass via the second router.
- The Google new athlete branch cannot complete without a guardian email; the client Google flow (`Auth.tsx`) collects the guardian email before the branch calls `createPendingAthlete`. Google athletes have no password; their pending to active transition is identical, and they re authenticate through Google after activation.
- Single choke point, enforced in the database. No path (admin create, seeds, a future roster import) may insert or update a `players` row to `status='active'` except through guardian verification. The migration adds a trigger that raises unless a matching `guardian_consents` row (`consented=true`, `revoked_at IS NULL`) and a `parent_child_relations` row with `status='verified'` exist for that player (section 10). Admin or import driven activation must therefore create the consent record first, which routes it through the same audited path.
- Login refuses pending athletes. In `authRoutes.ts` login (line 221) and `emailAuthRoutes.ts` login, if the athlete row `status='pending_guardian'`, return 403 `{ code: 'GUARDIAN_PENDING' }` with a resend affordance and no token. A `deactivated` athlete (section 7 revocation) returns 403 `{ code: 'ACCOUNT_DEACTIVATED' }`.
- Defense in depth: new middleware `server/middleware/requireActivated.ts`, applied after `requireAuth` on athlete gated routes, returns 403 `{ code: 'GUARDIAN_PENDING' }` when `req.user.role === 'athlete'` and `players.status !== 'active'`, so any legacy or leaked token for a pending or deactivated account cannot use the app.

### B3. Code security (short codes introduce a brute force surface that did not exist before)
- Central logic in a new `server/lib/verificationCodes.ts` (`issueCode`, `verifyCode`, `expireOthers`). Codes are stored only as a keyed hash, never plaintext. Use an HMAC keyed by a dedicated `CODE_PEPPER` secret over SHA256 (`crypto.createHmac('sha256', CODE_PEPPER)`), NOT a bare `crypto.createHash('sha256')`, so a database leak alone does not reveal the small code space by lookup. Compare with `crypto.timingSafeEqual`, never `===`.
- Code space by channel. The email channels (`link_consent`, `email_verify`, `password_reset`) use an 8 character alphanumeric code over an unambiguous alphabet (no 0/O/1/l), which is trivial to enter from an email and far larger than a 6 digit space. The SMS channel (`phone_verify`) uses a 6 digit numeric code because entry friction matters on a phone; the strict per code attempt cap plus the lifetime cap below is the real defense there, not IP limiting.
- Expiry 15 minutes. `max_attempts` default 5; after 5 failures the code is locked and the guardian must request a resend. Resend has a 60 second cooldown and a per hour cap. A hard LIFETIME cap bounds total codes minted per `(player_id, purpose)` and per destination (default 10 over the pending window and a per destination daily cap); past the cap the girl is routed to Contact Jonte rather than issued more codes, closing the "burn codes to widen the cumulative guess window" attack. On issue, prior unused codes and any prior `link_token` for the same `(player_id, purpose, channel)` are invalidated, so a resend also invalidates the old guardian email link. Verify and resend endpoints are rate limited on the shared store (section 7).

### B4. Client surfaces
- `client/src/pages/Auth.tsx`: always collect guardian email for athlete signup (email and Google paths), reject a guardian email equal to the girl's email client side as a first pass, add guardian phone as optional, and after submit show the pending state instead of logging in.
- New `client/src/pages/GuardianVerify.tsx` mirroring `client/src/pages/VerifyEmail.tsx`, reading the `link_token` from the URL, posting to the guardian verify endpoint, collecting the code and the guardian's password (create or sign in), with resend.
- Pending state in `client/src/context/AuthContext.tsx`: model `pending_guardian` distinctly from authenticated and unauthenticated. A light poll on `pendingToken` or a "I have the code" affordance advances the girl once the guardian verifies.
- `sendGuardianConsentEmail` added to `server/email.ts` with real, plain language copy addressed to the guardian, the child's name, the code, the single use link, the 15 minute expiry, and a clear "you are approving your child joining HERS365 and creating your parent account" statement.

---

## 7. Workstream C: Security hardening to an award winning level

### Threat model (minors platform)
- **Assets.** Minor PII (email, dob, phone, location, photos, game film), guardian contact, private messages, payment data, session tokens, consent records, the consent audit trail.
- **Adversaries.** Predators seeking contact with a minor; a minor attempting to self approve by supplying an inbox she also controls; scrapers and enumerators harvesting minor profiles and emails; credential stuffers and token thieves; an attacker weaponizing SMS or email send paths for toll fraud or an inbox bomb; a malicious or careless insider reading or bulk exporting PII, or mutating the audit trail; an abuser exhausting a shared rate limit to lock out others.
- **Attack surfaces today.** Open registration; the new short guardian code endpoints; IP keyed limiters on a per process store that bucket all traffic under the Railway proxy IP; non revocable 7 day JWTs; public read media at guessable URLs with no upload gate; a minor's email and name embedded in the JWT; account enumeration on register; in memory plaintext tokens; SMS and email send paths with no abuse ceiling.
- **Safety invariants that must hold.** No coach to athlete contact without a verified guardian approved link (already enforced, keep it). No active minor account without a verified adult guardian of record (Workstream B, enforced in the database). No minor PII in public views or tokens. A tamper evident consent trail exists for every activation, revocation, and admin PII read. Minor media cannot be uploaded until an activated account with a verified guardian exists, and not at all until scanning ships (V2).

### Prioritized control checklist (tied to real files)

**P0, this rollout, launch critical**
1. Proxy aware rate limiting on a shared store. Set `app.set('trust proxy', N)` in `server/app.ts` before any limiter mounts, where N is Railway's actual proxy hop count determined empirically (do NOT blindly trust every `X-Forwarded-For` hop, which lets an attacker spoof `req.ip` and defeat IP limits, and do NOT under count and bucket everyone). Back ALL `express-rate-limit` instances (auth, guardian verify and resend, newsletter, and the new global limiter) with a shared Redis store (`rate-limit-redis`) so limits hold across Railway instances; the default per process store is bypassable by hitting a different instance. Add an integration check that `req.ip` reflects the forwarded client address and that an extra spoofed hop is not trusted.
2. Durable, peppered, attempt limited, lifetime capped verification codes (Workstream B3), keyed HMAC over `CODE_PEPPER` and compared with `crypto.timingSafeEqual`. This also replaces the in memory Maps in `emailAuthRoutes.ts:188` to `192` for email verify and password reset with rows in `guardian_verification_codes` (purpose `email_verify`, `password_reset`), hashed at rest, never plaintext.
3. Opaque, single use guardian tokens. The guardian email link carries an unguessable `link_token` (`crypto.randomUUID()` or 256 bit random), stored on `guardian_verification_codes`, never a raw `playerId`. `POST /api/auth/guardian/verify` and `POST /api/auth/guardian/resend` accept only that token or the girl's `pendingToken`, and `GET /api/auth/guardian/status` accepts only `pendingToken`, so `playerId` is not enumerable and a guessed code cannot target an arbitrary player.
4. Guardian adult identity binding (Workstream B). Activation requires the guardian to establish a password backed `parents` account of record (or be an existing verified parent), not merely click a code; the guardian's IP and user agent are recorded on `guardian_consents` and auto flagged when they match the girl's signup session. The Stripe subscription remains the gate for coach contact features; a password backed parent account is the minimum adult binding for activation.
5. Single choke point plus tamper evident audit, enforced in the database. A `BEFORE INSERT OR UPDATE` trigger on `players` raises if `status` becomes `active` without a linked verified consent (section 10). `consent_audit_log` and `admin_access_log` are append only at the database layer: `REVOKE UPDATE, DELETE` from the application role and a `BEFORE UPDATE OR DELETE` trigger that raises; each row carries a `prev_hash` and `row_hash` for a tamper evident chain. `guardian_consents` blocks DELETE (revocation is an allowed UPDATE to `revoked_at`, which is itself audited).
6. Persisted parental consent plus append only audit on the DEPLOYED path (a new `server/api/guardian.ts` and writes from `server/api/parent.ts`), NOT in `compliance-service.ts` which does not deploy. Write audit rows on consent grant and revoke, on guardian code sent and verified, and on parent approval in `parent.ts:133` to `175`. The `framework` value is recorded accurately: for 13 to 17 self signup, COPPA does not legally apply, so record `framework='parental_consent'` with a `consent_version`, not a hardcoded `COPPA`; reserve `COPPA` for any future under 13 managed accounts, and note applicable state minor privacy and age appropriate design regimes for counsel to confirm (section 16).
7. Rate limit the new and existing verify endpoints and add a conservative global limiter in `app.ts`, all on the shared store. Guardian verify: cap attempts per code and per IP; guardian resend: 60 second cooldown, hourly cap; `POST /api/auth/email/verify-email` currently has no limiter (`emailAuthRoutes.ts:234`), add one. The primary anti brute force for the short codes is the per code attempt cap plus the lifetime cap (item 2), with IP limits as a secondary layer. The global limiter is a loose ceiling so unauthenticated profile and media reads cannot be scraped at scale.
8. Hardened AND gated uploads (promoted from a quick win to P0 because minor media is the highest risk asset). In `server/cloud-storage.ts`: set server side encryption (`ServerSideEncryption` AES256 or aws:kms with a named key) on put and presign, replace `Date.now()+Math.random()` object keys with `crypto.randomUUID()`, and make objects private served via short TTL signed download URLs instead of public read (stop emitting a public immutable URL). In `server/uploadRoutes.ts`: set a content length range on the presigned PUT so the Zod size cap is enforced, and gate every upload behind `requireActivated` plus a verified guardian check. Additionally gate all minor media upload behind a new `MEDIA_UPLOAD_ENABLED` flag that defaults false at launch, so minors cannot upload photos or film until perceptual hash CSAM matching and content scanning ship in V2 (section 15). The hardening lands now so the surface is safe when the flag is later turned on.
9. Send path abuse controls. In `server/lib/sms.ts`: enforce an E.164 country allowlist (US and CA only initially), per destination and per player send caps, and a global daily SMS spend circuit breaker to stop toll fraud and SMS pumping. In `server/email.ts` and `server/api/newsletter.ts`: double opt in (A2) plus per destination and per source IP caps so the guardian consent and newsletter emails cannot be weaponized to bomb a victim address.
10. `helmet` explicit HSTS and a strict Content Security Policy in `app.ts:37` to `42`, promoted to P0 because access tokens are Bearer and client stored, so an XSS to token theft path is a direct minor PII exfiltration route; CSP is not a P2 nicety on a minors platform. Pin the CORS origin to the production host.
11. Secrets and env assertions plus a secrets inventory in `server/core-server.ts`. Require an explicit `APP_ENV=production` in production so the existing required env and 32 character `JWT_SECRET` guards (`core-server.ts:13` to `45`) cannot be silently skipped; assert `CORS_ORIGIN` is a non localhost value; assert `REDIS_URL` is set in production (item 13); assert `CODE_PEPPER` is set and at least 32 characters; assert the Twilio credentials when `SMS_ENABLED` is true. Document rotation: rotating `JWT_SECRET` invalidates all live tokens (forced re login), `CODE_PEPPER` rotation invalidates outstanding codes, and the SSE KMS key and Twilio credentials are named and rotated on a schedule.
12. FERPA and data minimization decided now, not deferred to a doc chore. Collecting `gpa`, `school`, and `gradYear` on minors is a data minimization and breach blast radius decision. For this safety first rollout, stop collecting `gpa`, `school`, and `gradYear` in the minor signup and onboarding path; if any are retained later they must be optional, post activation, encrypted at rest, kept out of `PII_FIELDS` public views, and documented against the FERPA "no educational records" position. The documentation is written in the P0 to P1 window (item 20 fills the doc, the decision is made here).

**P1, this rollout**
13. Token revocation that does not depend on optional Redis being healthy. Provision Redis on Railway and assert `REDIS_URL` at boot in production; `redis.ts:99` to `114` currently fails open so logout is a no op without it. At runtime, if Redis is unreachable, revocation and blocklist checks FAIL CLOSED (deny or force re auth) and alert, never silently restore the no op. Shorten `JWT_EXPIRES` from `7d` to `1h` in `server/auth.ts:12` and add refresh token rotation using the existing `refreshTokens` table (`schema.ts:762` region, `tokenHash` unique) WITH reuse detection: presenting a previously rotated (already consumed) refresh token revokes the entire token family for that user and forces re login. This closes both the "stolen 7 day token cannot be revoked" gap and the "rotation without reuse detection buys little" gap.
14. Cookie hardening. The deployed path is pure Bearer, but logout clears a `refreshToken` cookie (`authRoutes.ts:394` to `420`); ensure it is `httpOnly`, `secure` in production, `sameSite` lax or strict, and that refresh tokens are stored only as hashes in `refreshTokens`.
15. Account enumeration defense. `emailAuthRoutes.ts:104` to `106` returns a distinct 409 "An account with this email already exists"; change register to a generic response (send a "check your email" style message and, for an existing account, a reset style notice) so an attacker cannot probe which minor or parent emails exist. Login and forgot password are already enumeration safe, keep them.
16. JWT PII minimization. Drop `email` and `name` from the token payload in `server/auth.ts:29` to `32`; keep `userId` and `role` and hydrate the rest server side. Reduces minor PII in bearer tokens and logs.
17. Admin PII access auditing via a single enforced interceptor, not scattered manual calls. Add `server/middleware/auditPiiAccess.ts` mounted on `server/adminRoutes.ts` (and any route returning unstripped minor PII) that writes an `admin_access_log` row for every admin read of minor PII and alerts on bulk reads over a threshold. A forgotten manual call is not acceptable given the named insider adversary.
18. Minor data deletion and retention lifecycle. On `parent_child_relations.status='revoked'`, set the linked `players.status='deactivated'` and `deactivated_at`, halt processing for that minor, and enqueue deletion of the minor's PII, messages, and uploaded media within a stated SLA (default 30 days), writing audit rows throughout. Expose a parent review and delete action in `server/api/parent.ts` so a guardian can review and delete their child's data. This is a core child privacy obligation, not a status flag flip.

**P1, upload fixes beyond the P0 hardening (rest of uploads is V2)**
19. The private objects, `crypto.randomUUID()` keys, server side encryption, content length range, activation gating, and `MEDIA_UPLOAD_ENABLED` default off all land in P0 item 8. Perceptual hash CSAM matching, antivirus, and image or video content moderation remain V2 and are the precondition for setting `MEDIA_UPLOAD_ENABLED` true.

**P2, this rollout, low effort**
20. Fill the empty `docs/PROTECTION-STRATEGY.md` and `docs/DATA-SOURCES-LEGAL-COMPLIANCE.md` with the actually implemented controls, the data flow, the retention SLA, and the recorded consent framework and FERPA position from items 6 and 12. (The substantive minimization and framework decisions are made in P0, not here; this item only documents them.)

### COPPA and FERPA consent record
- Every activation writes a `guardian_consents` row using the field set based on `compliance-types.ts:195` to `217` (`consent_type`, `framework`, `consented`, `consent_version`, `consent_text`, `method`, `granted_at`, `revoked_at`, `expires_at`, `granted_by`, `ip_address`, `user_agent`, `metadata`; note `method` is a new column, not present in that interface), with `framework` recorded accurately per P0 item 6 (not hardcoded). Revocation flips `parent_child_relations.status='revoked'`, sets `revoked_at`, triggers the deactivation and deletion lifecycle in P1 item 18, and writes a `consent_audit_log` `revoked` row. Nothing UPDATEs or DELETEs `consent_audit_log`; the database enforces it.

---

## 8. Workstream D: Usability and quality

### D1. Signup and onboarding for a young athlete
- Add an explicit age gate and a guardian consent step to the signup or onboarding flow before any profile is created or visible (`client/src/pages/Auth.tsx`, `client/src/pages/Onboarding.tsx`). Today `Onboarding.tsx` has no age gate and no parent in the loop. Remove the `gpa`, `school`, and `gradYear` collection from this minor path per section 7 item 12.
- Rewrite recruiting jargon aimed at minors. Remove or soften "380+ coaches are already scouting the grid" (`Onboarding.tsx:514`) and the "Get Seen. Get Ranked. Get Recruited." framing on `LandingPage.tsx`. Copy targets a young girl's reading level: short sentences, plain words, no pressure.
- Add the pending screen and guardian code entry (Workstream B4). Represent pending in `AuthContext`.

### D2. Parent experience and guards
- Add route guards for `/parent`, `/parent/dashboard`, `/admin`, `/admin/login`, `/staff` in `client/src/App.tsx` (lines 237 to 276 region); today these render unguarded inside the athlete `Layout`.
- Give parents their own shell and navigation instead of the athlete sidebar. Add `client/src/components/ParentLayout.tsx` (or a parent variant in `Layout.tsx`) and a "For Parents" nav entry plus a parent value section; the paying customer currently has no acquisition surface. Scope note: the meeting deferred the parent dashboard to V2 wholesale; because `ParentDashboard.tsx` already exists, this rollout only guards, shells, and wires the existing surface (and makes its toggle accessible), and defers all net new dashboard capability to V2 (section 15). This is a deliberate, called out pull forward, not a scope creep.
- Make the parent dashboard toggle accessible: `ParentDashboard.tsx` `SettingRow` (lines 36 to 38) is a `motion.div` with `onClick`; give it `role="switch"`, `aria-checked`, `tabindex`, and keyboard handling. Add the parent review and delete action (section 7 item 18) here.

### D3. Mobile and Capacitor
- In `client/index.html` line 9, remove `user-scalable=no` and `maximum-scale=1.0` (keep `viewport-fit=cover`); this fails WCAG 1.4.4 and contradicts the app's own accessibility statement. The existing 16px input rule (`index.css:757`) already prevents iOS focus zoom, so the lock is unnecessary. Align `theme-color` (line 10) from `#0f172a` to `#0a0a0a`.
- Keep the good Capacitor base (`capacitor.config.ts`, `scrollEnabled:false`, safe area insets, StatusBar and Keyboard handling).

### D4. Accessibility to AA
- Raise low contrast text to at least 4.5:1: `Onboarding.tsx` `MUTED_2 #5a5a56`, `Contact.tsx` labels `#555`, and the input placeholder `#3a3a3a` (`index.css:591`).
- Make custom controls operable: the parent toggle (above), the `LandingPage.tsx` leaderboard rows (`lb-row` div `onClick`, lines 556 to 561), and the `Events.tsx` event registration and filter chips become real buttons or links (the event chips are the only place this rollout touches the calendar or event flow, per section 2 and A5).
- Add a skip to content link in `client/src/components/Layout.tsx` (there is none anywhere today).
- Enforce a 44 by 44 minimum tap target: add `min-height` to `.k-btn` (`index.css:456`, currently none, roughly 37px), and bump small chip and nav paddings (`Events.tsx` register and filter chips, landing nav links).
- Refresh `client/src/pages/Accessibility.tsx` to match reality once the above lands; it currently overclaims and is dated "Last reviewed June 2025".

### D5. Real copy and states
- No lorem or placeholder. Remove or gate the fabricated live data on `LandingPage.tsx` (live ticker, "4,200+ athletes", "14 coach views today", demo profile) so nothing fake shows pre launch.
- Every new surface (coming soon, newsletter, pending, guardian verify) has explicit empty, loading, and error states with plain copy.

---

## 9. Workstream E: Visual rebrand to purple, hot pink, neon green

**Rule.** The dark ramp in `index.css:16` to `23` stays byte for byte. Only the accent system changes, and it changes by role, not by blind find and replace. Fonts stay DM Sans plus Barlow Condensed (`tailwind.config.js:34` to `37`); leave the `theme.ts` DISP mis set to DM Sans as is unless typography is separately in scope.

### E1. Author the token block (`client/src/index.css:25` to `41`)
Replace the orange block with, keeping the dark ramp untouched:
```css
--accent: #8B3BFF;
--accent-hover: #A66BFF;
--accent-text: #C4A3FF;              /* small purple text/links on dark, AA >= 4.5:1 */
--accent-on: #FFFFFF;                /* text/icons ON a purple fill (flips from #0A0A0C) */
--accent-glow: 0 0 0 1px rgba(139,59,255,.4), 0 8px 32px -8px rgba(139,59,255,.35);
--pink: #FF2E93;
--pink-text: #FF6FB3;                /* small pink text on dark, AA */
--pink-on: #0A0A0C;
--pink-glow: 0 8px 32px -8px rgba(255,46,147,.35);
--neon: #39FF14;                      /* high signal only */
--neon-on: #0A0A0C;
--gradient-brand: linear-gradient(135deg, #8B3BFF 0%, #FF2E93 100%);
```

### E2. Rewrite the 53 literals inside `index.css` by role
- Primary fills, `.nav-active`, `.k-btn-primary`, `.k-input:focus`, focus visible fallback, scroll progress, scrollbar, selection: `var(--accent)` and `rgba(139,59,255,...)`.
- Small accent text (`.k-tag`, `.k-pos-badge`, `.hers-rank-delta`): `var(--accent-text)` (#C4A3FF), never the #8B3BFF fill, so small text passes AA.
- Progress fills and hero gradients: `var(--gradient-brand)`.
- Energy accents (notification dots, active tabs, trending, secondary CTAs): `var(--pink)`.
- High signal only (verified or guardian approved badges, live now, success, the single your rank spotlight, `.rk-row-self`, the `hers-glow` spotlight): `var(--neon)`, sparingly, as 1px outlines, dots, small chips, and glows. Never body text, never a large flat fill, never more than one on screen at rest.
- Alias or rename `.coral`, `.bg-coral`, `.k-badge-coral` so downstream class names still resolve.

### E3. Tailwind (`client/tailwind.config.js:10` to `21`)
- Lowest risk path: keep the key name `coral` and remap its hex values to a purple ramp so all 108 `coral-*` utility classes flip to purple in one edit (`500:#8B3BFF`, `400:#A66BFF`, and sensible darker and lighter stops, each verified for AA where used as text). Then add `pink` (`500:#FF2E93`, `text:#FF6FB3`) and `neon` (`500:#39FF14`) scales and hand migrate the roughly 20 classes that should be pink or neon by role.

### E4. JS constants (`client/src/lib/theme.ts:3` to `4` and `46`)
- `FLAME='#8B3BFF'`, `FLAME_SOFT='#A66BFF'`, and the `glowBlob` rgba to `rgba(139,59,255,...)`. Add `PINK='#FF2E93'`, `PINK_SOFT='#FF6FB3'`, `NEON='#39FF14'`. This updates 269 references across 30 files through the constants; then grep those 30 files for raw literals that bypass the constants and fix by role.

### E5. Straggler sweep of the raw hex literals (386 matches across 59 files)
The per file counts below are TOTAL accent references (raw hex plus `FLAME` constant uses plus `coral-*` classes), not raw hex alone, so do not treat them as a literal checklist: `Settings.tsx` for example is almost entirely `coral-*` classes that E3 already flips, and `Drills.tsx` is mostly `FLAME` uses that E4 already flips. Ordered by total accent references: `Onboarding.tsx` 49, `Feed.tsx` 46, `LandingPage.tsx` 42, `Settings.tsx` 33, `Auth.tsx` 31, `Messages.tsx` 29, `Recruiting.tsx` 27, `Profile.tsx` 26, `ResetPassword.tsx` 24, `Drills.tsx` 19, then the long tail including `NotificationBell.tsx` and `YourRankDock.tsx`. In each file replace `#ff5a2d` with purple, `#ff7a52` and `#ff8c66` with `--accent-text` or the gradient, `rgba(255,90,45,a)` with `rgba(139,59,255,a)`, and reassign energy and high signal spots to pink and neon by role. The real exit check for E5 is the hex only grep in section 12 returning 0, once E3 has flipped the coral classes and E4 the `FLAME` constants.

### E6. Green policy and cleanup
- The existing functional green `#4ade80` appears 50 times in `client/src` (verified count; the online dot at `index.css:450`, `.k-badge-green` at `index.css:567`, and success states). Proposal, pending Samuel's confirmation in section 16: keep `#4ade80` as the success and online color and reserve `#39FF14` neon strictly for verified or guardian approved, live now, and the single your rank spotlight, so neon does not spread to the 50 existing green sites. The target palette lists neon for "success"; this proposal deliberately diverges to avoid retina burn from a saturated green on success surfaces, but it stays an open decision, not a settled one.
- Delete `client/src/App.css` (dead Vite boilerplate, not imported, references undefined `--accent-bg` and `--accent-border`).

### E7. Contrast verification (a duty, not an assumption)
Run an automated contrast check on every accent used as text or as a fill with text. Targets to verify: `#C4A3FF` on `#0A0A0C` and `#FF6FB3` on `#0A0A0C` (small text, need >= 4.5:1), `#FFFFFF` on `#8B3BFF` (about 5:1, verify), `#0A0A0C` on `#FF2E93` and on `#39FF14` (fill with text). Neon is never body text or a large flat fill.

---

## 10. Data model changes (Drizzle plus migration 0009)

Migrations run 0000 to 0008 (verified: last is `0008_dark_hellcat.sql`); the next is `server/migrations/0009_guardian_gate.sql`. Add tables and columns in `server/schema.ts` in lockstep, following the style of 0007 and 0008. Because `@ts-nocheck` hides bad column refs, run the migration against the local DB (`postgres://localhost:5432/hers365`) to verify.

### Column additions
**`players` (`schema.ts:4` to `50`)**
- `status text NOT NULL DEFAULT 'pending_guardian'` (values `pending_guardian | active | deactivated`), fail closed for new inserts.
- `activated_at timestamp` (nullable), `deactivated_at timestamp` (nullable).
- `pending_token text UNIQUE` (nullable; opaque token returned to the girl's client so the pending screen can advance without exposing `playerId`).
- Migration order matters: run the backfill BEFORE creating the activation trigger below. Backfill: `UPDATE players SET status='active', activated_at=created_at;` once, to grandfather all existing athletes so no current user is locked out. New athlete inserts explicitly set `pending_guardian`.

**`parents` (`schema.ts:240` to `251`)**
- `email_verified boolean NOT NULL DEFAULT false`
- `phone_verified boolean NOT NULL DEFAULT false`
- `phone_e164 text` (normalized; keep existing `phone` as display).

**`parent_child_relations` (`schema.ts:254` to `260`)**
- `is_primary boolean DEFAULT false`
- `status text NOT NULL DEFAULT 'pending'` (values `pending | verified | active | revoked`)
- `consent_id integer references guardian_consents(id)`
- `verified_at timestamp`, `revoked_at timestamp`
- Stop writing `relationship='pending'` in `authRoutes.ts:200` and `parent.ts:361`; write the real `relationship` plus `status`. Backfill: rows where `relationship='pending'` get `status='pending'`, else `status='active'`.

### New tables
**`guardian_consents`** (real backing for `ConsentRecord`, columns based on `compliance-types.ts:195` to `217` plus a new `method` column)
`id serial PK; parent_id integer references parents(id); player_id integer references players(id); consent_type text NOT NULL; framework text NOT NULL; consented boolean NOT NULL; consent_version text NOT NULL; consent_text text NOT NULL; method text; granted_at timestamp DEFAULT now(); revoked_at timestamp; expires_at timestamp; granted_by text; ip_address text; user_agent text; withdrawal_reason text; metadata jsonb DEFAULT '{}'`. `framework` is written with the actually applicable basis (section 7 item 6), not a constant. DELETE is blocked at the database layer; revocation is an UPDATE to `revoked_at`.

**`guardian_verification_codes`** (durable, peppered, replaces the in memory Maps)
`id serial PK; parent_id integer references parents(id) NULL; player_id integer references players(id); relation_id integer references parent_child_relations(id) NULL; channel text NOT NULL (email | sms); destination text NOT NULL (the email or E.164 phone); code_hash text NOT NULL (keyed HMAC over CODE_PEPPER, never plaintext); link_token text UNIQUE (opaque single use guardian link, NULL for non link channels); purpose text NOT NULL (link_consent | email_verify | phone_verify | password_reset); attempts integer NOT NULL DEFAULT 0; max_attempts integer NOT NULL DEFAULT 5; expires_at timestamp NOT NULL; consumed_at timestamp; used boolean NOT NULL DEFAULT false; metadata jsonb DEFAULT '{}' (stores the girl's signup ip and user agent for the self approval check); created_at timestamp DEFAULT now()`. Partial index on `(destination, purpose) WHERE used = false`. The lifetime cap in B3 is enforced by counting rows per `(player_id, purpose)` and per `destination`.

**`consent_audit_log`** (append only, tamper evident, never UPDATE or DELETE)
`id serial PK; consent_id integer references guardian_consents(id); parent_id integer; player_id integer; action text NOT NULL (granted | revoked | expired | code_sent | code_verified | link_created | deactivated | deletion_enqueued | self_approval_flagged); actor_type text; actor_id integer; ip_address text; user_agent text; detail jsonb DEFAULT '{}'; prev_hash text; row_hash text; created_at timestamp DEFAULT now()`. Immutability is enforced in the migration: `REVOKE UPDATE, DELETE ON consent_audit_log FROM` the application role, plus a `BEFORE UPDATE OR DELETE` trigger that raises. `row_hash` chains over `prev_hash` for tamper evidence.

**`admin_access_log`** (append only, same immutability protection)
`id serial PK; admin_id integer references admin_users(id); action text NOT NULL (pii_read | bulk_read | export); subject_type text; subject_id integer; fields text; count integer; ip_address text; user_agent text; prev_hash text; row_hash text; created_at timestamp DEFAULT now()`. Written by `server/middleware/auditPiiAccess.ts` (section 7 item 17). Same `REVOKE UPDATE, DELETE` plus trigger.

**`newsletter_subscribers`** (double opt in)
`id serial PK; email text NOT NULL UNIQUE; name text; source text (signup | footer | landing | coming_soon); status text NOT NULL DEFAULT 'pending' (pending | subscribed | unsubscribed | bounced); parent_id integer references parents(id) NULL; confirm_token text UNIQUE; confirmed_at timestamp; consent_at timestamp DEFAULT now(); unsubscribed_at timestamp; unsubscribe_token text UNIQUE; created_at timestamp DEFAULT now()`. New rows start `pending` and only become `subscribed` after the confirm link is clicked.

### Database enforced invariants (in the migration, not application code)
- Activation choke point: a `BEFORE INSERT OR UPDATE` trigger on `players` raises unless, when `NEW.status='active'`, there exists a `guardian_consents` row for the player with `consented=true AND revoked_at IS NULL` and a `parent_child_relations` row with `status='verified'`. Create this trigger AFTER the one time backfill so grandfathering is not blocked.
- Audit immutability: `REVOKE UPDATE, DELETE` and a raising trigger on `consent_audit_log` and `admin_access_log`; `REVOKE DELETE` on `guardian_consents`.

Generate all of the above as one migration `0009_guardian_gate.sql` via `drizzle-kit`, with matching FK constraints, then hand add the triggers and grants that `drizzle-kit` does not emit. Acceptance: `npx tsc --noEmit` passes and the migration applies cleanly via `npm run db:setup` against the local DB.

---

## 11. API changes (concrete endpoints)

**Changed**
- `POST /api/auth/register` (`authRoutes.ts:125`): athlete branch now calls `createPendingAthlete`; returns 202 `{ status:'pending_guardian', pendingToken, guardianEmailMasked }` and no token. Parent and coach branches unchanged except still kill switch gated. `guardianEmail` is required for all athletes and is rejected when it equals the girl's email.
- `POST /api/auth/google` (`authRoutes.ts:307`): new athlete branch requires a guardian email and routes through `createPendingAthlete`; existing users unchanged. Google athletes re authenticate through Google after activation.
- `POST /api/auth/email/register` (`emailAuthRoutes.ts:72`): athlete path routes through `createPendingAthlete`, ending the divergent behavior; email verify and password reset tokens move to `guardian_verification_codes`.
- `POST /api/auth/login` and `POST /api/auth/email/login`: a `pending_guardian` athlete gets 403 `{ code:'GUARDIAN_PENDING' }`, a `deactivated` athlete gets 403 `{ code:'ACCOUNT_DEACTIVATED' }`, no token.
- `POST /api/auth/email/verify-email` (`emailAuthRoutes.ts:234`): add a rate limiter on the shared store.
- Logout (`authRoutes.ts:394` to `420`): revocation must actually work (Redis provisioned, fail closed if unreachable), refresh rotation with reuse detection, cookie hardened.

**New (mount in `server/app.ts`; new `server/api/guardian.ts` and `server/api/newsletter.ts`)**
- `POST /api/auth/guardian/verify { linkToken, code, password? }`: validates the code against `guardian_verification_codes` by `link_token` (never `playerId`), requires an established or newly created password backed parent account, and on success activates the player, sets link status and `consent_id`, writes `guardian_consents` and `consent_audit_log`, marks the code used and the `link_token` consumed; returns 200 `{ activated:true }`. Public, rate limited. Does not return the girl's token.
- `POST /api/auth/guardian/resend { pendingToken }`: 60 second cooldown, hourly cap, lifetime cap, invalidates the prior unused code and its `link_token`, reissues, generic response.
- `POST /api/auth/guardian/verify-phone { linkToken, code }`: SMS channel equivalent, gated on the SMS provider being enabled, with the toll fraud controls in section 7.
- `GET /api/auth/guardian/status?pendingToken=`: returns `{ status }` only, no PII, no `playerId`, rate limited, so the pending screen can advance.
- `POST /api/newsletter/subscribe { email, name?, source }`, `GET /api/newsletter/confirm?token=`, and `GET /api/newsletter/unsubscribe?token=`: public, rate limited, enumeration safe, double opt in.
- Optional `GET /api/guardian/consents/:playerId`: parent or admin scoped read of consent history for audit; admin reads pass through `auditPiiAccess`.

**New middleware and libs**
- `server/middleware/requireActivated.ts`, `server/middleware/auditPiiAccess.ts`, `server/lib/guardianRegistration.ts`, `server/lib/verificationCodes.ts`, `server/lib/sms.ts` (Twilio, gated by `SMS_ENABLED`, with the country allowlist and spend circuit breaker), and `sendGuardianConsentEmail`, `sendNewsletterConfirm`, `sendNewsletterWelcome` in `server/email.ts`.

---

## 12. Acceptance criteria (checkable)

**Workstream A**
- [ ] With `VITE_REGISTRATION_ENABLED` unset, visiting `/` renders `ComingSoon`, and the recruiting `LandingPage`, `/auth?tab=signup`, onboarding, and any public event registration route are unreachable.
- [ ] `POST /api/newsletter/subscribe` inserts a `newsletter_subscribers` row with `status='pending'`, returns generic success for a new and an existing email alike, and sends exactly one confirmation email; `GET /api/newsletter/confirm?token=` flips status to `subscribed`; `GET /api/newsletter/unsubscribe?token=` flips status to `unsubscribed`.
- [ ] Subscribing the same email repeatedly is rate limited per destination and per source IP (no inbox bomb).
- [ ] A "Contact Jonte" CTA reaches the existing contact backend.
- [ ] `registrationClosed.test.ts` asserts all create paths return 403 while newsletter endpoints stay open.

**Workstream B**
- [ ] Athlete signup on the live client path returns 202 with no token and creates a `players` row with `status='pending_guardian'` and a `pending_token`.
- [ ] A guardian email equal to the girl's email is rejected; a same registrable domain match is flagged in code metadata.
- [ ] A `pending_guardian` athlete cannot log in (403 `GUARDIAN_PENDING`) and cannot use any athlete gated route even with a hand issued token (`requireActivated`).
- [ ] The guardian verify page requires the code AND a password backed parent account (create or sign in); a code alone does not activate.
- [ ] Entering the correct code with an established parent account sets `players.status='active'` and `activated_at`, sets the link `status='verified'` and `consent_id`, and writes one `guardian_consents` row plus `consent_audit_log` rows for `code_verified`, `granted`, `link_created`.
- [ ] Guardian IP or user agent matching the girl's signup session sets `metadata.self_approval_suspected=true` and writes a `self_approval_flagged` audit row.
- [ ] The guardian link uses an opaque single use `link_token`; `verify` and `status` reject or ignore raw `playerId`, and a consumed `link_token` cannot be reused.
- [ ] A wrong code increments `attempts`; the 6th attempt is rejected as locked; a code past 15 minutes is rejected as expired; resend enforces the 60 second cooldown and the lifetime cap.
- [ ] Codes are stored as keyed HMAC over `CODE_PEPPER`, compared with `crypto.timingSafeEqual`; no plaintext code is ever persisted.
- [ ] All three create paths (`authRoutes` register, `authRoutes` google, `emailAuthRoutes` register) go through `createPendingAthlete`; none returns a usable token for a new athlete; a direct SQL `UPDATE players SET status='active'` without a verified consent is rejected by the trigger.

**Workstream C**
- [ ] `app.get('trust proxy')` is set to Railway's real hop count, an integration test shows `req.ip` equals the forwarded client address, and a spoofed extra `X-Forwarded-For` hop is not trusted.
- [ ] All rate limiters use the shared Redis store; limits hold when requests hit different simulated instances.
- [ ] With Redis provisioned, a logged out token is rejected before its natural expiry; with Redis unreachable at runtime, revocation checks fail closed; boot fails if `REDIS_URL` or `CODE_PEPPER` is unset in production; `JWT_EXPIRES` is `1h`.
- [ ] A reused (already rotated) refresh token revokes the entire token family and forces re login.
- [ ] Register returns a generic response for an existing email (no distinct 409).
- [ ] The JWT payload contains only `userId` and `role`.
- [ ] No verification or reset token is stored in an in memory Map; all live in `guardian_verification_codes` as keyed HMAC hashes.
- [ ] Uploaded objects are private, keyed with `crypto.randomUUID()`, encrypted at rest, served via short TTL signed URLs, and the presigned PUT enforces a content length range; every upload is gated by `requireActivated` plus a verified guardian, and `MEDIA_UPLOAD_ENABLED` defaults false so minor media upload is off at launch.
- [ ] `consent_audit_log` and `admin_access_log` reject UPDATE and DELETE from the application role; `guardian_consents` rejects DELETE.
- [ ] Every admin read of minor PII writes an `admin_access_log` row via `auditPiiAccess`; a bulk read raises an alert.
- [ ] Revoking a guardian link deactivates the player, halts processing, and enqueues deletion within the stated SLA; a parent can trigger review and delete.
- [ ] `guardian_consents.framework` is not the constant `COPPA` for a 13 to 17 athlete; `gpa`, `school`, and `gradYear` are not collected in the minor signup path.
- [ ] SMS sends are limited to the country allowlist with per destination and per player caps and a daily spend circuit breaker.
- [ ] `helmet` sets HSTS and a strict CSP, and CORS is pinned to the production host.
- [ ] Boot asserts `APP_ENV=production`, a non localhost `CORS_ORIGIN`, `REDIS_URL`, `CODE_PEPPER`, and the Twilio credentials when `SMS_ENABLED`.
- [ ] `docs/PROTECTION-STRATEGY.md` and `docs/DATA-SOURCES-LEGAL-COMPLIANCE.md` are non empty and describe implemented controls, the retention SLA, and the recorded consent framework and FERPA position.

**Workstream D**
- [ ] Signup or onboarding has an age gate and a guardian consent step before a profile is created, and does not collect `gpa`, `school`, or `gradYear`.
- [ ] `/parent`, `/parent/dashboard`, `/admin`, `/staff` are guarded; parents see parent navigation, not the athlete sidebar.
- [ ] `client/index.html` no longer contains `user-scalable=no` or `maximum-scale=1.0`; `theme-color` is `#0a0a0a`.
- [ ] The parent toggle exposes `role="switch"` and `aria-checked` and is keyboard operable; landing leaderboard rows and event chips are buttons or links; a skip to content link exists; `.k-btn` has `min-height >= 44px`.
- [ ] No placeholder or fabricated live data renders pre launch.

**Workstream E**
- [ ] `grep -rniE "ff5a2d|ff6633|ff7a52|ff8c66|ff8a6a|255, ?90, ?45" client/src` returns 0.
- [ ] `grep -rniE "coral-[0-9]" client/src` returns 0, or only intentionally aliased class names.
- [ ] Every accent resolves through `var(--accent | --pink | --neon)`, the `FLAME`/`PINK`/`NEON` constants, or the remapped Tailwind scale.
- [ ] The dark ramp in `index.css:16` to `23` is unchanged; `App.css` is deleted.
- [ ] Automated contrast check passes for all accent text and fill with text combinations; neon appears at most once on screen at rest and never as body text or a large flat fill; `#4ade80` remains the success and online color per the section 16 decision.

---

## 13. Verification plan

- **Types.** `npx tsc --noEmit` must pass. Remember `@ts-nocheck` on most server files means tsc will not catch a bad column reference, so also run the migration.
- **Migration and DB.** `npm run db:setup` applies `0009_guardian_gate.sql` cleanly against `postgres://localhost:5432/hers365`. Confirm the `players` backfill activated all existing rows and that the activation trigger was created after the backfill. Confirm the immutability grants and triggers exist by attempting an UPDATE and a DELETE on `consent_audit_log` and `admin_access_log` and expecting a raise.
- **Lint.** `npm run lint` clean.
- **Tests.** `npm test` (vitest). Use the `hers365_test` DB. Note the local dev gotchas from Samuel's environment: run `npm ci --ignore-scripts` and fix any lockfile skew before installing. Extend `registrationClosed.test.ts`; add tests for the pending state, code expiry, attempt lockout, resend cooldown, lifetime cap, the self email rejection, the opaque token flow, the activation trigger rejecting an unconsented activation, refresh token reuse detection, and login refusal of pending and deactivated accounts.
- **Run.** `npm run dev:core` boots the server with the new routers mounted and the env assertions active.
- **Manual flows.** Girl signs up and lands on pending; guardian receives the email code and single use link, sets a password, and verifies; girl logs in and reaches the app; a Google athlete activates and re authenticates through Google; a wrong code locks after 5 tries; resend respects cooldown and the lifetime cap; coming soon renders when the flag is off; newsletter subscribe, confirm, and unsubscribe work; parent and admin routes are guarded; a revoked guardian link deactivates the girl.
- **Security checks.** Confirm `req.ip` is the client behind the proxy and a spoofed hop is rejected; confirm limiters are on the shared store; confirm a logged out token is rejected and that a runtime Redis outage fails closed; confirm register does not reveal existing accounts; confirm the JWT payload has no email or name; confirm uploaded objects are private and encrypted and that upload is blocked while `MEDIA_UPLOAD_ENABLED` is false; confirm an admin PII read writes an `admin_access_log` row; confirm the audit tables reject mutation.
- **Contrast.** Run an automated WCAG checker over the token combinations in section E7.
- **Rebrand sweep.** The two grep commands in section 12 both return 0. Baseline before work: 386 raw orange hex literals across 59 files (`ff5a2d` alone is 165); counting the `FLAME` constant references E4 flips and the `coral-*` classes E3 remaps, about 790 total accent references touch 66 files.

---

## 14. Rollout sequence (order, dependencies, criticality)

1. **A first (launch critical).** The A1 coming soon gate and Contact Jonte are pure client plus reuse of the existing contact backend, so they depend on nothing and ship immediately as the thing that must be true in production right now. The event registration lockdown in A5 is gate wiring and ships with A1. One caveat: the A2 newsletter backend writes to `newsletter_subscribers`, which only exists after migration 0009, so land that table first (run 0009, or split just that table into an earlier migration) before A2 goes live.
2. **Data model 0009 (blocks A2, B, and C, launch critical).** All new tables and columns, the backfill, then the triggers and grants. A2, B, the consent record, the audit log, the admin access log, and the activation choke point all sit on this.
3. **B (depends on 0009, launch critical).** Guardian gated registration and verification, the shared `createPendingAthlete`, the self email rejection, opaque tokens, peppered codes, the adult identity binding, client pending and guardian verify surfaces, login refusal, `requireActivated`.
4. **C (parallel with B where possible, launch critical for P0 items).** P0 first: trust proxy hop count and shared limiter store, peppered DB codes, opaque tokens, adult binding, the activation and audit triggers, consent plus audit on the deployed path, verify rate limiting, hardened and gated uploads with `MEDIA_UPLOAD_ENABLED` off, send path abuse controls, HSTS and CSP, env assertions and secrets inventory, and the FERPA and data minimization decision. Then P1: Redis provisioning with fail closed and short lived tokens with reuse detection, cookie hardening, enumeration defense, JWT minimization, admin PII audit middleware, and the deletion and retention lifecycle. P2 (docs) can trail into the launch window.
5. **D (depends on A and B for the new surfaces; launch critical for guards and the zoom and consent fixes, the rest is quality).** Route guards, parent shell, age gate and consent step, dropping `gpa`/`school`/`gradYear`, mobile zoom and theme color, contrast and tap targets and skip link, real copy.
6. **E last (independent of A to D, can start in parallel but land last to avoid churn; launch critical for brand, low risk).** Token block, index.css literals, Tailwind remap, theme.ts constants, straggler sweep, green policy, App.css delete, contrast verification.

**Demo and launch critical:** A entirely; 0009 with triggers; B entirely; C P0 (including hardened and gated uploads, opaque tokens, adult binding, peppered codes, CSP); D guards, age and consent step, zoom fix; E the central token edits so the demo is on brand. **Nice to have this rollout:** C P1 refinements beyond Redis and the deletion lifecycle, D contrast and tap target polish, the full straggler tail in E, SMS if the provider is chosen.

---

## 15. V2 and out of scope (deferred meeting items)

- ID matching: verify all submitted IDs match participant info.
- Automated secure Dropbox or cloud storage per participant and secure participant document storage. Includes full upload safety beyond this rollout's hardening: perceptual hash CSAM matching, antivirus, and image or video content moderation. These are the precondition for turning `MEDIA_UPLOAD_ENABLED` true; until then minor media upload stays off.
- Event check in verification (meeting Option 2) as a complementary identity check at the event, and event level guardian gating of per event RSVP (distinct from the account level gate this rollout ships).
- Advanced parent dashboard and participant management beyond guarding and shelling the existing dashboard. Scope note: the meeting deferred the parent dashboard to V2 wholesale; this rollout pulls only guarding, shelling, wiring, the accessible toggle, and the review and delete action forward because `ParentDashboard.tsx` already exists, and defers all net new dashboard capability here.
- The AWS 50k user infrastructure (RDS, ECS, ElastiCache, ALB, CloudFront) and video S3 plus CloudFront provisioning; this rollout stays on Vercel plus Railway.
- SMS guardian phone verification ships as a fast follow if the provider is not chosen before launch; the schema and endpoints support it from day one.

---

## 16. Open questions for Jonte and decisions for Samuel

**For Jonte and Richard (from the meeting):**
1. How are girls currently being added?
2. Is there an existing registration form?
3. Where does the participant list originate?
4. Is there another system collecting registrations today?
5. Production host: the meeting action item said "move the website onto a production server." We read the current Vercel plus Railway deploy as already production and are treating that item as satisfied. Confirm this satisfies the intent, or name the intended dedicated host.

The repo has no participant roster or import path (`docs/DATA-SOURCES-LEGAL-COMPLIANCE.md` is empty), so questions 1 to 4 cannot be answered from code and must be resolved before a real import is designed. Next step once Jonte answers: any import path must create pending athletes and route through guardian consent (it cannot insert `active` players, enforced by the activation trigger), so the roster import is scoped as a follow on that reuses `createPendingAthlete`, not a bulk activate.

**For Samuel to decide:**
- SMS provider. Twilio is the assumed choice (`server/lib/sms.ts` is written against it, with the country allowlist and spend circuit breaker). Confirm, and whether SMS ships this rollout or as a fast follow.
- Domain name to purchase (Priority 1), and the timing of the iOS universal links update it forces.
- Green policy: the target palette assigns neon green to "success"; this PRD proposes reserving `#39FF14` neon for verified, live, and your rank only and keeping `#4ade80` (50 refs) for success and online. Confirm the proposal or choose to unify. This is an open decision, not settled.
- Consent framework and legal position. For 13 to 17, COPPA does not apply; this PRD records `framework='parental_consent'` and defers the applicable state minor privacy and age appropriate design determination to counsel. Confirm the recorded framework label and consent version, and confirm counsel review.
- FERPA and data minimization. This PRD stops collecting `gpa`, `school`, and `gradYear` in the minor path. Confirm that dropping them is acceptable, or specify which to retain with encryption and a documented FERPA position.
- Whether to collect the girl's email at all versus routing everything through the guardian; the meeting Option 1 explicitly collects the girl's email, so this PRD does, while keeping it in `PII_FIELDS` and never verifying or messaging the minor beyond what is needed.
- Under 13 managed accounts remain out of scope for self signup; confirm that stays deferred.

---

## 17. Appendix

### A. Palette token table (old value to new value)

**CSS custom properties (`client/src/index.css`)**

| Token | Old | New |
| --- | --- | --- |
| `--accent` | `#FF5A2D` | `#8B3BFF` |
| `--accent-hover` | (none) | `#A66BFF` |
| `--accent-text` | `#FF7A52` | `#C4A3FF` |
| `--accent-on` | `#0A0A0C` | `#FFFFFF` |
| `--accent-glow` | `rgba(255,90,45,...)` | `0 0 0 1px rgba(139,59,255,.4), 0 8px 32px -8px rgba(139,59,255,.35)` |
| `--pink` | (none) | `#FF2E93` |
| `--pink-text` | (none) | `#FF6FB3` |
| `--pink-on` | (none) | `#0A0A0C` |
| `--pink-glow` | (none) | `0 8px 32px -8px rgba(255,46,147,.35)` |
| `--neon` | (none) | `#39FF14` |
| `--neon-on` | (none) | `#0A0A0C` |
| `--gradient-brand` | (none) | `linear-gradient(135deg, #8B3BFF 0%, #FF2E93 100%)` |

Dark ramp unchanged: `--surface-0 #0A0A0C`, `--surface-1 #121216`, `--surface-2 #1A1A20`, `--border #2A2A32`, `--border-strong #3A3A44`, `--text-primary #F5F5F7`, `--text-secondary #A0A0AB`, `--text-tertiary #6B6B76`.

**Tailwind scale (`client/tailwind.config.js`)**

| Class family | Old (`coral`) | New |
| --- | --- | --- |
| `500` | `#ff5a2d` | `#8B3BFF` |
| `400` | `#ff6633` | `#A66BFF` |
| `600` | `#e64a1f` | darker purple, verify AA |
| `700` to `900` | orange ramp | purple ramp, verify AA where used as text |
| new `pink` 500 / text | (none) | `#FF2E93` / `#FF6FB3` |
| new `neon` 500 | (none) | `#39FF14` |

**JS constants (`client/src/lib/theme.ts`)**

| Constant | Old | New |
| --- | --- | --- |
| `FLAME` | `#ff5a2d` | `#8B3BFF` |
| `FLAME_SOFT` | `#ff8a6a` | `#A66BFF` |
| `glowBlob` rgba | `rgba(255,90,45,...)` | `rgba(139,59,255,...)` |
| `PINK` | (none) | `#FF2E93` |
| `PINK_SOFT` | (none) | `#FF6FB3` |
| `NEON` | (none) | `#39FF14` |

**Raw literal swaps for the straggler sweep:** `#ff5a2d` to purple; `#ff7a52` and `#ff8c66` to `--accent-text` or the gradient; `rgba(255,90,45,a)` to `rgba(139,59,255,a)`; energy and high signal spots reassigned to pink and neon by role.

### B. Exact file list to touch

**Server**
- `server/app.ts` (trust proxy hop count, shared Redis limiter store, mount guardian and newsletter routers, global limiter, helmet HSTS and CSP, CORS pin)
- `server/core-server.ts` (production env assertions and secrets inventory: APP_ENV, REDIS_URL, CORS_ORIGIN, CODE_PEPPER, Twilio when SMS_ENABLED)
- `server/authRoutes.ts` (register and google rework, guardian email required, login pending and deactivated refusal, logout revocation with reuse detection, cookie hardening)
- `server/emailAuthRoutes.ts` (route athletes through shared flow, move token Maps to DB, rate limit verify, enumeration fix)
- `server/lib/athleteGate.ts` (require guardian email for all athletes, reject guardian email equal to child email, keep under 13 block)
- `server/lib/guardianRegistration.ts` (new, shared `createPendingAthlete`)
- `server/lib/verificationCodes.ts` (new, keyed HMAC over CODE_PEPPER, timingSafeEqual, attempt and lifetime caps, 8 char alphanumeric email codes, 6 digit SMS)
- `server/lib/sms.ts` (new, Twilio, gated, country allowlist, per destination and per player caps, daily spend circuit breaker)
- `server/lib/registration.ts` (referenced, unchanged)
- `server/email.ts` (add `sendGuardianConsentEmail`, `sendNewsletterConfirm`, `sendNewsletterWelcome`; per destination and per source IP send caps)
- `server/api/guardian.ts` (new: verify by link_token, resend by pendingToken, `verify-phone`, status by pendingToken, consents)
- `server/api/newsletter.ts` (new: subscribe, confirm, unsubscribe; double opt in)
- `server/api/parent.ts` (write link `status` and `consent_audit_log`, stop writing `relationship='pending'`, add review and delete action and the deactivation and deletion lifecycle)
- `server/api/messages.ts` (audit log on moderation block and report; gate unchanged)
- `server/adminRoutes.ts` (mount `auditPiiAccess` on minor PII reads)
- `server/middleware/requireActivated.ts` (new)
- `server/middleware/auditPiiAccess.ts` (new, writes `admin_access_log`, alerts on bulk reads)
- `server/auth.ts` (drop email and name from JWT, `JWT_EXPIRES` to `1h`, refresh rotation with reuse detection and token family revocation)
- `server/redis.ts` (production assertion, fail closed at runtime when unreachable)
- `server/cloud-storage.ts` and `server/uploadRoutes.ts` (private objects, randomUUID keys, SSE, short TTL signed URLs, content length range, activation and verified guardian gate, MEDIA_UPLOAD_ENABLED)
- `server/schema.ts` (all new tables and columns)
- `server/migrations/0009_guardian_gate.sql` (new, plus the activation trigger, immutability grants and triggers, hash chain columns)
- `server/test/registrationClosed.test.ts` (extend) plus new tests for the guardian flow, code security, activation trigger, reuse detection, and deletion lifecycle

**Client**
- `client/index.html` (viewport zoom fix, `theme-color`)
- `client/src/App.tsx` (route `/` to `ComingSoon` behind flag, lock event registration behind the flag, guard `/parent` and `/admin` and `/staff`, add guardian verify and pending routes)
- `client/src/pages/ComingSoon.tsx` (new)
- `client/src/pages/GuardianVerify.tsx` (new; reads link_token, code plus guardian password)
- `client/src/pages/Auth.tsx` (guardian email always and rejected when equal to child email, guardian phone optional, pending state, copy)
- `client/src/pages/Onboarding.tsx` (age gate, consent step, drop gpa/school/gradYear, copy, straggler colors)
- `client/src/pages/LandingPage.tsx` (copy, gate fabricated live data, colors, leaderboard rows as links)
- `client/src/pages/ParentDashboard.tsx` (accessible toggle, parent shell, review and delete action)
- `client/src/pages/Events.tsx` (tap target sizing only; event registration behind the flag)
- `client/src/components/Layout.tsx` (skip to content link, For Parents nav)
- `client/src/components/ParentLayout.tsx` (new, optional)
- `client/src/components/Footer.tsx` (copy, newsletter, For Parents)
- `client/src/context/AuthContext.tsx` (pending state via pendingToken)
- `client/src/pages/Accessibility.tsx` (refresh to match reality)
- `client/src/pages/Contact.tsx` (Contact Jonte, label contrast)
- `client/src/index.css` (token block, 53 literals, contrast, tap targets, skip link styles)
- `client/tailwind.config.js` (coral to purple ramp, add pink and neon)
- `client/src/lib/theme.ts` (FLAME, PINK, NEON)
- `client/src/App.css` (delete)
- Straggler pages and components: `Feed.tsx`, `Settings.tsx`, `Messages.tsx`, `Recruiting.tsx`, `Profile.tsx`, `ResetPassword.tsx`, `Drills.tsx`, `NotificationBell.tsx`, `YourRankDock.tsx`, and the remaining tail from the 66 file baseline.

**Docs and config**
- `docs/PROTECTION-STRATEGY.md` and `docs/DATA-SOURCES-LEGAL-COMPLIANCE.md` (fill with implemented controls, data flow, retention SLA, framework and FERPA position)
- `README.md` (framing note toward safety first)
- `DEPLOYMENT.md` and `client/vercel.json` (domain and universal links note)
- Env: `REGISTRATION_ENABLED`, `VITE_REGISTRATION_ENABLED`, `JWT_SECRET`, `JWT_EXPIRES`, `REDIS_URL`, `CORS_ORIGIN`, `APP_ENV`, `CODE_PEPPER`, `MEDIA_UPLOAD_ENABLED`, `SMS_ENABLED`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, and the SMS country allowlist and daily spend cap settings.