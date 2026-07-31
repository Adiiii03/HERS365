# HERS365 to Bubble.io Migration Specification

## Executive Summary

HERS365 is a recruiting platform for girls flag football athletes, built with React/Express/PostgreSQL. The application manages **four primary user roles**: Athletes (players), Parents, Coaches, and Admins, with complex parent-gated messaging for safety compliance.

Key characteristics:
- Dark theme UI with orange accent (#ff5a2d)
- Real-time data visualization (rankings, stats)
- Stripe-based subscription tiers (Free, Pro, Elite)
- AI-powered features (NIL advisor, training plans, bot chat, archetype assignment)
- Parent-controlled privacy and communication settings
- Event-driven architecture with extensive audit/compliance features
- External integrations (MaxPreps scraping, OpenAI, Cloudflare R2/S3 for media)

**Migration Complexity: High** - The application has sophisticated role-based access control, parent-gating for minor safety, real-time messaging, and AI integrations that will require careful Bubble implementation.

---

## All Pages and Screens

### Public Pages (No Authentication Required)
| Route | Page | Purpose |
|-------|------|---------|
| `/` | LandingPage | Hero section, feature overview, leaderboard preview |
| `/auth` | Auth | Login/signup with email/password or OAuth |
| `/auth/callback` | AuthCallback | OAuth callback handler |
| `/forgot-password` | ForgotPassword | Password recovery |
| `/reset-password` | ResetPassword | Password reset |
| `/verify-email` | VerifyEmail | Email verification |
| `/rankings` | Rankings | Public athlete rankings |
| `/coach/login` | CoachLogin | Coach portal authentication |
| `/coach/signup` | CoachSignup | Coach registration with verification workflow |

### Athlete Pages (Athlete Role Required)
| Route | Page | Purpose |
|-------|------|---------|
| `/feed` | Feed | Social feed with posts/stories |
| `/profile` | Profile | Own profile management, stats, highlights |
| `/profile/:id` | PlayerProfile | View other athletes |
| `/training` | Training | Combine stats tracking, drill library |
| `/recruiting` | Recruiting | Recruiting dashboard |
| `/nil` | NIL | NIL opportunities marketplace (Elite tier only) |
| `/video-studio` | VideoStudio | Video editing/highlight creation |
| `/settings` | Settings | Account settings |
| `/messages` | Messages | Messaging with coaches (requires parent approval) |
| `/onboarding` | Onboarding | New athlete setup flow |
| `/scholarships` | ScholarshipTracker | Scholarship search/saving |
| `/events` | Events | Event browsing and registration |
| `/drills` | Drills | Drill library |
| `/reels` | Reels | Video reels showcase |
| `/college-fit` | CollegeFitCalculator | College matching tool |
| `/leagues` | LeagueFinder | League search |
| `/squads` | SquadFinder | Squad/team finder |
| `/teams/find` | TeamFinder | Team search |

### Coach Pages (Coach Role + Verified Required)
| Route | Page | Purpose |
|-------|------|---------|
| `/coach` | CoachDashboard | Overview with analytics, trending players |
| `/coach/search` | CoachPlayerSearch | Advanced player search with filters |
| `/coach/board` | CoachScoutingBoard | Saved prospects management |
| `/coach/analytics` | CoachAnalytics | Detailed recruiting metrics |
| `/coach/messages` | CoachMessages | Message history |
| `/coach/roster` | CoachRoster | Team roster view |
| `/coach/player/:id` | CoachPlayerProfile | Detailed athlete profile view |

### Parent Pages (Parent Role Required)
| Route | Page | Purpose |
|-------|------|---------|
| `/parent/dashboard` | ParentDashboard | Children overview, message approvals, settings |

### Admin Pages (Admin Role Required)
| Route | Page | Purpose |
|-------|------|---------|
| `/admin/login` | AdminLogin | Admin authentication |
| `/admin` | AdminDashboard | Admin dashboard |
| `/staff` | StaffDashboard | Staff interface |

### Static Content Pages
- `/about`, `/privacy`, `/accessibility`, `/contact`, `/cookies`, `/terms`, `/faq`, `/help`

---

## Navigation

### Main Navigation (Athlete)
- Bottom navigation bar with icons: Feed, Profile, Training, NIL, Messages
- Top navigation: Logo, Search, Notifications, User menu

### Coach Navigation
- Left sidebar: Dashboard, Player Search, Scouting Board, Messages, Analytics
- Top bar: Logo, Notifications

### Role-Based Route Guards
- **Athlete**: Redirect to `/auth` if no token
- **Coach**: Redirect to `/coach/login` if not authenticated/verified
- **Parent**: Access parent dashboard when linked to athlete
- **Admin**: Access admin routes when authenticated

---

## User Roles and Permissions

### Athlete (Player)
- **Age Requirement**: 13+ (under-13 requires parent-managed account)
- **Can**: Create/edit profile, upload highlights (limited on free tier), view rankings, message coaches (via parent approval), apply to NIL deals (Elite tier)
- **Cannot**: See full coach contact info without parent approval

### Parent
- **Can**: Approve/reject coach message requests, control child's profile visibility, access child's activity log
- **Cannot**: View messages directly, only gate them for child

### Coach
- **Verification Required**: All new coaches are unverified until admin approval
- **Can**: Search athletes, save prospects, message athletes (with parent approval), view own analytics
- **Cannot**: See full athlete contact info without parent approval

### Admin
- **Can**: View all users, approve coaches, manage content
- **Cannot**: View private messages (only audit logs)

---

## Database Schema

### Core User Data Types

**Athletes (User data type)**
```
Fields:
- id (unique ID)
- email (email, unique)
- password_hash (text)
- name (text)
- bio (text)
- position (text)
- age (number)
- state (text)
- city (text)
- zipCode (text)
- school (text)
- gradYear (number)
- g5Rating (number, 1-5 stars)
- nilPoints (number)
- xpPoints (number)
- level (number)
- archetype (text)
- gpa (text)
- sport (text)
- achievements (text)
- verificationStatus (text: unverified/verified)
- subscriptionTier (text: free/pro/elite)
- privacySetting (text: public/private)
- segment (text: youth/high_school/college/elite)
- skillTier (text: beginner/intermediate/advanced/elite)
- heightIn (number)
- weightLbs (number)
- phone (text)
- isRecreational (boolean)
- dob (date)
- pendingParentEmail (text)
- preferences (JSON for settings)
- profileImage (text/URL)
- emailVerified (boolean)
- createdAt (date)
```

**Parents (User data type)**
```
Fields:
- id (unique ID)
- email (email, unique)
- password_hash (text)
- name (text)
- phone (text)
- preferences (JSON)
- createdAt (date)
```

**Coaches (User data type)**
```
Fields:
- id (unique ID)
- email (email, unique)
- password_hash (text)
- name (text)
- university (text)
- division (text)
- recruitingPositions (text)
- recruitingStates (text)
- verifiedStatus (boolean)
- verificationRequestedAt (date)
- verifiedAt (date)
- verificationNote (text)
```

**Admin Users (User data type)**
```
Fields:
- id (unique ID)
- username (text, unique)
- password_hash (text)
- role (text)
```

### Supporting Data Types

**Teams (Data type)**
```
Fields:
- id (unique ID)
- name (text)
- logo (image/URL)
- state (text)
- city (text)
- conference (text)
- division (text)
- wins (number)
- losses (number)
- titles (number)
- rating (number)
- tuitionInState (number)
- tuitionOutState (number)
- hasApplication (boolean)
- hasQuestionnaire (boolean)
- applicationUrl (text)
- questionnaireUrl (text)
- socials (JSON)
- type (text: college/high_school)
```

**Events (Data type)**
```
Fields:
- id (unique ID)
- name (text)
- date (text)
- location (text)
- registrationDeadline (text)
- participantCount (number)
- capacity (number)
- price (number in cents)
- description (text)
- upcoming (boolean)
```

**NIL Opportunities (Data type)**
```
Fields:
- id (unique ID)
- brandName (text)
- requirements (text)
- deliverables (text)
- estimatedEarnings (number)
```

**Messages (Data type)**
```
Fields:
- id (unique ID)
- coachId (Athlete)
- athleteId (Athlete)
- senderId (number)
- senderType (text: coach/athlete)
- content (text)
- read (boolean)
- deletedAt (date)
- deletedBy (text)
- createdAt (date)
```

**Message Requests (Data type)**
```
Fields:
- id (unique ID)
- athleteId (Athlete)
- receiverId (number)
- content (text)
- status (text: pending/approved/rejected/sent)
- parentId (Parent, optional)
- createdAt (date)
- updatedAt (text)
```

**Notifications (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- type (text: like/comment/follow/mention/coach_interest)
- actorName (text)
- read (boolean)
- createdAt (date)
```

**AIBots (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- botName (text)
- personality (text)
- interactionCount (number)
```

**BotConversations (Data type)**
```
Fields:
- id (unique ID)
- botId (AIBots)
- role (text: user/assistant)
- content (text)
- createdAt (date)
```

**AthleteRankings (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete, unique)
- nationalRank (number)
- stateRank (number)
- positionRank (number)
- percentile (number)
- movement (text: up/down/same)
- overallScore (number)
- combineScore (number)
- maxPrepsScore (number)
- zybekScore (number)
- usaTalentIdScore (number)
- dataSources (text)
- updatedAt (text)
```

**PlayerHighlights (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- videoUrl (text/URL)
- thumbnailUrl (text/URL)
- category (text)
- season (text)
- annotations (list of text)
- clipSettings (JSON)
- createdAt (date)
```

**Scholarships (Data type)**
```
Fields:
- id (unique ID)
- name (text)
- amount (number)
- deadline (text)
- requirements (text)
- category (text)
- eligibleStates (text)
- createdAt (date)
```

**Saved Scholarships (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- scholarshipId (Scholarships)
- savedAt (date)
```

**Awards/Badges (Data type)**
```
Fields:
- id (unique ID)
- name (text)
- description (text)
- icon (text)
- category (text)
```

**PlayerBadges (Join data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- badgeId (Badges)
- earnedAt (date)
```

**EventRegistrations (Data type)**
```
Fields:
- id (unique ID)
- eventId (Events)
- playerId (Athlete)
- checkedIn (boolean)
```

**Subscription Plans (Data type)**
```
Fields:
- id (unique ID)
- name (text)
- price (number in cents)
- tierLevel (text: free/pro/elite)
```

**PlayerSubscriptions (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- planId (SubscriptionPlans)
- status (text)
- stripeSubscriptionId (text)
- stripeCustomerId (text)
- createdAt (date)
- updatedAt (date)
```

**Payments (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- amount (number)
- currency (text)
- status (text: pending/paid/failed)
- paymentMethod (text)
- paymentType (text)
- description (text)
- stripePaymentIntentId (text)
- stripeCustomerId (text)
- receiptUrl (text)
- createdAt (date)
```

**CoachProspects (Data type)**
```
Fields:
- id (unique ID)
- coachId (Coaches)
- athleteId (Athlete)
- tier (text: target/watching/offered)
- notes (text)
- createdAt (date)
```

**GameStats (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- gameId (number)
- passingAttempts (number)
- passingCompletions (number)
- passingYards (number)
- passingTds (number)
- interceptionsThrown (number)
- longestPass (number)
- rushingAttempts (number)
- rushingYards (number)
- rushingTds (number)
- longestRun (number)
- receptions (number)
- receivingYards (number)
- receivingTds (number)
- longestReception (number)
- flagPulls (number)
- interceptionsCaught (number)
- passBreakups (number)
- defensiveTds (number)
```

**CombineStats (Data type)**
```
Fields:
- id (unique ID)
- playerId (Athlete)
- fortyDash (text)
- shuttle (text)
- vertical (text)
- broadJump (text)
- threeCone (text)
- season (text)
```

---

## Data Relationships

### One-to-Many Relationships
- Athlete → PlayerHighlights (1 athlete has many highlights)
- Athlete → GameStats (1 athlete has many game stats)
- Athlete → CombineStats (1 athlete has combine stats)
- Athlete → Messages (as athleteId)
- Athlete → Notifications
- Athlete → NIL Applications
- Athlete → Saved Scholarships
- Athlete → PlayerBadges
- Athlete → PlayerSubscriptions
- Athlete → EventRegistrations

### Many-to-Many Relationships
- Athlete ↔ Coach (via CoachProspects - scouting board relationship)
- Athlete ↔ NIL Opportunities (via DealApplications)
- Athlete ↔ Teams (via ProgramApplications - interest in college programs)

### Parent-Child Relationships
- Parent → ParentChildRelations (links to athletes)
- Parent → MessageRequests (approves/rejects)
- Parent settings stored on Player.preferences JSON

### Coach Events Relationship
- Coach → CoachEvents (for analytics tracking)

---

## Authentication

### Implementation in Bubble

**Authentication Plugin**: Use Bubble's built-in "Bubble Auth" or a custom auth setup

**Email/Password Authentication**:
- Standard email/password signup with email verification
- JWT-style tokens via Bubble's session management
- Social logins: Google OAuth (via plugin), GitHub OAuth

**Role-Based Authentication Flow**:

1. **Signup**: User selects role (athlete/parent) at registration
2. **Token Storage**: Store authentication in Bubble's built-in session
3. **Role Check**: Each page checks user's role field to determine access

**Coach Verification Flow**:
```
Backend Workflow: Handle coach registration
1. Create coach user with verifiedStatus = "false"
2. Send notification to admin (via email or admin dashboard)
3. Admin approves via admin dashboard
4. Update verifiedStatus = "true"
```

**Parent-Gating Logic**:
```
For athletes under 18:
1. Upon signup, check if dob < 18 years
2. If parentEmail provided, send invite to create parent account
3. Parent-child linking via ParentChildRelations table
4. All coach messages require parent approval
```

**Session Management**:
- Use Bubble's native session handling
- Add expiration and refresh logic via backend workflows
- Store user role and subscription tier in session

---

## Business Logic

### Subscription Tier Logic

**Free Tier Limitations**:
- Max 3 highlight uploads
- No coach messaging
- No NIL marketplace access
- Basic profile visibility

**Pro Tier Features**:
- Unlimited highlights
- Coach messaging (with parent approval)
- Performance analytics dashboard
- Priority ranking visibility

**Elite Tier Features**:
- Everything in Pro
- Verified badge
- NIL marketplace access
- Scout spotlight placement
- Dedicated recruiting advisor

**Implementation**:
- Use Bubble's "Update Tier" workflow when subscription is purchased
- Add "UpgradeGate" reusable element that checks current user's tier
- Privacy rules should enforce feature access based on tier

### Scoring Algorithm

**HERS Rating Calculation** (via backend workflow):
```
1. Combine score (30% weight)
2. MaxPreps stats (25% weight) 
3. Zybek data (25% weight)
4. USA Talent ID (20% weight)
5. Calculate overall score 0-100
6. Determine tier (Elite 90+, High Major 75-89, etc.)
7. Update AthleteRankings table
```

### Profile Completion Logic
- Bio (20%): >= 20 characters
- Height & Weight (20%): Both values present
- GPA (20%): Value present
- Highlight (20%): At least 1 highlight uploaded
- Achievements (20%): Value present

---

## Workflows

### Auth Flows

**User Signup Flow**:
1. Validate form fields
2. Check age requirement (13+)
3. Create user account
4. Create Stripe customer (via plugin)
5. Send verification email
6. Navigate to onboarding or parent dashboard

**Login Flow**:
1. Authenticate credentials
2. Load user role and data
3. Check subscription status
4. Navigate to appropriate dashboard

**Coach Registration Flow**:
1. Create coach account (verifiedStatus = false)
2. Store verification note
3. Show pending verification message on dashboard
4. Admin must approve before search/messaging enabled

### Messaging Flows

**Coach Initiated Contact**:
```
Workflow: Coach sends contact request
1. Validate coach is verified
2. Create MessageRequest with athlete and coach IDs
3. Notify parent via notification or email
4. Return pending status to coach
```

**Parent Approval Flow**:
```
Workflow: Parent approves message request
1. Verify parent owns the athlete
2. Update MessageRequest.parentId = current parent's ID
3. Update MessageRequest.status = "approved"
4. Enable messaging between coach and athlete
```

**Athlete Message Sending**:
```
Workflow: Send message (after parent approval)
1. Check hasParentApprovedLink() returns true
2. Check not blocked
3. Run content through OpenAI moderation
4. Create message record
5. Increment NIL points
6. Send notification to recipient
```

**Message Blocking**:
```
Workflow: Block conversation partner
1. Create entry in MessageBlocks table
2. Apply block to both directions
3. Hide blocked conversations in UI
4. Prevent new messages in both directions
```

### Highlight Upload Flow

**Direct-to-S3 Upload**:
1. Call backend API to get signed presigned URL from Bubble plugin
2. Upload file directly to S3/R2
3. Create highlight record with returned URL
4. Update profile with highlight thumbnail

**Video Upload Flow**:
1. Validate file size (< 500MB)
2. Get presigned URL with 6-hour TTL for video
3. PUT video to storage
4. Create highlight record with video URL

### NIL Application Flow

**Apply for Opportunity**:
1. Check user has Elite subscription
2. Create DealApplication record
3. Set status = "pending"
4. Show confirmation in UI

### Event Registration Flow

**Register for Event**:
1. Create EventRegistrations record
2. Increment participantCount on event
3. Show registered status in UI

### Coach Prospect Management Flow

**Add to Scouting Board**:
1. Create CoachProspects record (tier = "watching")
2. Increment analytics counters
3. Show on scouting board

---

## Background Jobs

### Scheduled Workflows (via Bubble Backend Workflows)

**Daily Ranking Updates**:
- Schedule: Daily at 02:00 UTC
- Action: Run Recalculate All Rankings API workflow
- Iterate through all athletes, update scores

**Inactive Account Cleanup**:
- Schedule: Weekly
- Action: Delete/Archive accounts inactive > 2 years

**Notification Cleanup**:
- Schedule: Monthly
- Action: Mark old notifications as read

**Subscription Status Sync**:
- Schedule: Daily
- Action: Sync with Stripe to update active/cancelled subscriptions

**Profile View Tracking**:
- Workflow: When coach views athlete profile
- Log to ProfileViews table for analytics

### Asynchronous Processing

**Video Processing**:
- Use Backend Workflow triggered on video upload
- Generate thumbnail via AWS MediaConvert or CloudFlare
- Update highlight record with thumbnail URL

**AI Content Generation**:
- Asynchronous workflows for bot name generation, training plans
- Queue system to manage OpenAI API calls

---

## APIs and Third-Party Integrations

### External API Integrations (via Bubble API Connector Plugin)

**MaxPreps Integration**:
- Endpoint: External API calls to MaxPreps
- Used for: Player stats lookup, team rankings, leaders
- Implementation: Custom API calls from Bubble workflows

**OpenAI Integration**:
- Endpoint: https://api.openai.com/v1/chat/completions
- Used for: 
  - `chatBot()` - AI bot conversations
  - `chatNIL()` - NIL advisor
  - `generateTrainingPlan()` - Training plans
  - `supportChat()` - FAQ help
  - `assignArchetype()` - Player archetype assignment
  - `curateFAQ()` - FAQ organization
  - `moderateMessage()` - Content moderation

**Stripe Integration** (via Stripe.js plugin):
- Used for: Subscription management, payment processing
- Webhooks: Handle subscription events, payment success/failure

**Cloudflare R2/S3 Integration** (via API Connector):
- Used for: File uploads (images, videos)
- Generate presigned URLs for direct upload

### Internal API Endpoints (to replicate in Bubble)

**Authentication**:
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/register` - Create account
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/github` - GitHub OAuth

**Profile Management**:
- `GET /api/profile` - Get own profile
- `PUT /api/profile` - Update profile
- `GET /api/profile/stats` - Get own stats
- `GET /api/players/:id` - Get public profile

**Messaging**:
- `GET /api/messages/conversations` - List conversations
- `GET /api/messages/conversations/:id/messages` - Get thread
- `POST /api/messages` - Send message
- `POST /api/messages/block` - Block user
- `POST /api/messages/report` - Report user

**Coach Features**:
- `GET /api/coach/players/search` - Search athletes
- `GET /api/coach/board` - Get scouting board
- `POST /api/coach/players/:id/save` - Save prospect

**NIL**:
- `GET /api/nil/opportunities` - List opportunities
- `POST /api/nil/apply` - Apply for opportunity

**Events**:
- `GET /api/events` - List events
- `POST /api/events/register` - Register for event

---

## AI Functionality

### AI Features in Bubbles

All AI features use the OpenAI API via Bubble's API Connector. Each feature should be implemented as a separate API workflow call.

**Chat Bot**:
- Endpoint: `/bot/:playerId/chat`
- Purpose: Personal AI assistant for athletes
- Input: Message content, bot context
- Output: AI-generated response

**NIL Advisor**:
- Endpoint: `/nil/chat`
- Purpose: NIL compliance and branding advice
- Input: User question
- Output: Expert guidance

**Training Plan Generator**:
- Endpoint: `/training-plans`
- Purpose: Generate personalized training plans
- Input: Position, age, skill level
- Output: Weekly schedule, goals

**Support Chat**:
- Endpoint: Internal support feature
- Purpose: FAQ and platform help
- Input: Question, context
- Output: Helpful answer

**Archetype Assignment**:
- Purpose: Classify player based on stats
- Input: Position, performance stats
- Output: Archetype (e.g., "WR Speedster")

**Message Moderation**:
- Purpose: Safety filter for all messages
- Input: Message content
- Output: {allowed: boolean, reason: string}

**Implementation**:
- Use Bubble's "API Workflow" for each AI call
- Add loading states in UI
- Cache responses where appropriate
- Handle rate limiting gracefully

---

## Notifications

### Notification Types
- `like` - Someone liked your post
- `comment` - Someone commented on your post
- `follow` - Someone followed you
- `mention` - You were mentioned
- `coach_interest` - Coach viewed your profile or sent message request
- `message` - New message received

### Implementation in Bubble

**Database**: Notifications data type with fields as above

**Real-time**: Use Bubble's "When data changes" workflows:
1. When message is created → Create notification for recipient
2. When follow is created → Create follow notification
3. When coach views profile → Create coach_interest notification

**Badge Count**: 
- Run search on notifications with filter: playerId = Current User, read = false
- Display count in UI

**Mark All Read**: Update all notifications for user where read = false

---

## Email Flows

### Email Templates Needed

1. **Welcome/Athlete Signup Verification**
2. **Parent Invitation Email** - Invite to link with child
3. **Coach Registration Confirmation** - Acknowledgement pending admin review
4. **Coach Approval Notification** - When admin approves coach
5. **Message Request Notification** (to parent) - New coach contact request
6. **Message Received Notification** (to athlete) - After parent approval
7. **Subscription Confirmation** - Payment successful
8. **Subscription Cancelled** - User downgraded
9. **Password Reset** - Password recovery link
10. **Newsletter/Updates** - Periodic platform updates

### Implementation in Bubble
- Use Bubble's built-in "Send email" action
- Configure SendGrid or Postmark plugin for deliverability
- Template logic in backend workflows based on trigger events

---

## Payments

### Subscription Management via Bubble

**Stripe Integration**:
- Install "Stripe" plugin
- Create products/plans in Stripe dashboard
- Webhook endpoints:
  - `checkout.session.completed` → Activate subscription
  - `customer.subscription.deleted` → Downgrade to free

**Payment Flow**:
```
1. Athlete selects plan
2. Create Stripe checkout session via backend workflow
3. User redirected to Stripe
4. On success, webhook activates subscription
5. Update user.subscriptionTier field
```

**One-time Payments**:
- For events or special features
- Use Stripe Payment Intents
- Handle success/cancel redirects

**Subscription Tiers**:
- Free: $0/month
- Pro: $9.99/month  
- Elite: $29.99/month

---

## File Storage

### Media Uploads in Bubble

**Profile Photos**:
- Direct upload to S3/R2 via presigned URL
- Max size: 5MB
- Types: JPEG, PNG, WebP, GIF

**Video Highlights**:
- Direct upload to S3/R2 via presigned URL
- Max size: 500MB
- Types: MP4, MOV, etc.
- Long TTL (6 hours) for large files

**Implementation**:
- Create Backend API workflow to generate presigned URL
- Return: {uploadUrl, publicUrl}
- Frontend uploads directly to storage
- Create database record with returned URL

**CDN**: Use Cloudflare R2 with CloudFront distribution

---

## Security and Privacy Rules

### Critical Privacy Rules (MUST IMPLEMENT)

**Parent-Gated Communication**:
- Coaches CANNOT see athlete contact info without parent approval
- Messages only flow after `hasParentApprovedLink()` returns true

**Minor Protection**:
- Athletes under 13 cannot create accounts
- Athletes under 18 require parent oversight
- Contact info stripped from public views

**Privacy Settings** (stored in Player.preferences JSON):
- `coachDiscoverable` - Can coaches find this athlete? (default: true)
- `profileVisibility` - Is profile visible to others? (default: true)
- `rankingVisibility` - In public rankings? (default: true)
- `emailNotifications` - Email alerts? (default: true)
- `smsAlerts` - SMS notifications? (default: false)

**Content Moderation**:
- All messages moderated via OpenAI before storage
- Reports go to moderation queue
- Blocked users cannot message

**Implementation**:
- Bubble Privacy Rules on each data type
- Workflow conditions for parent approval checks
- Soft-delete on messages (keep for audit)

---

## Admin Features

### Admin Dashboard Components

**User Management**:
- View all athletes/parents/coaches
- Approve coach verifications
- Suspend/block users

**Analytics**:
- Total athletes
- Total coaches
- Pending verifications
- Messages today
- New signups this week

**Content Management**:
- Manage events
- Manage NIL opportunities
- Manage scholarships

**Audit Logs**:
- View security audit logs
- Review message reports
- Monitor compliance

---

## Edge Cases

### Critical Edge Cases to Handle

1. **Coach Pending Verification**:
   - All coach features disabled
   - Show specific dashboard message
   - 403 responses on coach endpoints

2. **Parent Not Linked**:
   - Message requests cannot be approved
   - Show prompt to invite parent

3. **Free Tier Highlight Limit**:
   - Enforce 3-highlight max
   - Redirect to subscription on 4th upload

4. **Underage Registration**:
   - Block signup for <13
   - Require parent for <18

5. **Geographic Restrictions**:
   - Some events limited by state
   - Rankings filter by state

6. **Network Failures**:
   - Retry logic on uploads
   - Offline graceful degradation

7. **Concurrent Modifications**:
   - Optimistic UI updates
   - Conflict resolution on save

8. **Mobile Platform Differences**:
   - iOS requires Safari for payments
   - Native OAuth limitations

---

## Required Bubble Plugins

### Essential Plugins

| Plugin | Purpose |
|--------|---------|
| Bubble Auth | Authentication management |
| Stripe.js | Subscription payments |
| API Connector | OpenAI, MaxPreps, S3 integrations |
| Google OAuth | Google sign-in |
| SendGrid/Postmark | Transactional emails |
| Chart.js | Analytics charts |
| Video.js | Video player for highlights |
| QR Code Generator | Share profile QR codes |
| Twilio (optional) | SMS notifications |

### Recommended Workflows

1. **Initialize User** - On signup, create related records
2. **Verify Coach** - Admin approval workflow
3. **Send Message** - With moderation and blocking checks
4. **Generate Presigned URL** - For media uploads
5. **Recalculate Rankings** - Batch update scores
6. **Process Payment Webhook** - Stripe event handling
7. **Send Notification** - Create notifications on events
8. **Moderate Content** - OpenAI content filtering

### Reusable Elements

| Element | Purpose |
|---------|---------|
| UpgradeGate | Block features based on subscription tier |
| ShareCard | Profile sharing image export |
| NotificationBell | Notification display with count |
| RoleBadge | Display coach/athlete/parent badge |
| Avatar | Consistent user avatar display |

---

## Migration Checklist

### Phase 1: Core Infrastructure
- [ ] Set up User data type with role field
- [ ] Configure authentication flows
- [ ] Implement Stripe subscription integration
- [ ] Set up OpenAI API connection
- [ ] Configure S3/R2 for file storage

### Phase 2: Athlete Features
- [ ] Profile creation and editing
- [ ] Stats tracking
- [ ] Highlight upload system
- [ ] Social feed
- [ ] NIL marketplace (limited)

### Phase 3: Coach Features
- [ ] Coach registration and verification
- [ ] Player search with filters
- [ ] Scouting board
- [ ] Messaging system (with parent gates)

### Phase 4: Parent Features
- [ ] Parent dashboard
- [ ] Message approval flows
- [ ] Child linking
- [ ] Privacy controls

### Phase 5: Admin Features
- [ ] Admin dashboard
- [ ] User management
- [ ] Analytics view
- [ ] Content management

### Phase 6: Polish
- [ ] Mobile responsiveness
- [ ] Loading states
- [ ] Error handling
- [ ] Testing all edge cases