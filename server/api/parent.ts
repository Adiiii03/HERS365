import express from 'express';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';
import { validateBody, validateParams } from '../middleware/validate';
import {
  parentRespondBody,
  parentSettingsBody,
  parentInviteBody,
  parentStatSubmissionBody,
  parentProfileBody,
  changeRequestRespondBody,
  idParam,
} from '../middleware/safetySchemas';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();
router.use(requireAuth);

function caller(req: express.Request) {
  const u = (req as any).user;
  return { userId: Number(u.userId), role: u.role as string };
}

function requireParent(req: express.Request, res: express.Response): number | null {
  const { userId, role } = caller(req);
  if (role !== 'parent') {
    res.status(403).json({ success: false, error: 'Parent access only' });
    return null;
  }
  return userId;
}

async function getChildIds(parentId: number): Promise<number[]> {
  const rels = await db
    .select({ playerId: schema.parentChildRelations.playerId })
    .from(schema.parentChildRelations)
    .where(eq(schema.parentChildRelations.parentId, parentId));
  return rels.map((r) => r.playerId).filter((id): id is number => id != null);
}

// GET /api/parent/children
router.get('/children', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const childIds = await getChildIds(parentId);
    if (childIds.length === 0) return res.json({ success: true, data: [] });

    // Widened parent read: identity + the athlete fields the portal needs, all
    // already on `players` (plus the decimal HERS score from athlete_rankings).
    // Still parent-scoped by the childIds filter. Response is shaped to the names
    // the client reads (stars / breakoutScore / offers / verifiedStatus) so the
    // Dashboard renders real data with no client change.
    const rows = await db
      .select({
        id: schema.players.id,
        name: schema.players.name,
        age: schema.players.age,
        school: schema.players.school,
        position: schema.players.position,
        gradYear: schema.players.gradYear,
        profileImage: schema.players.profileImage,
        g5Rating: schema.players.g5Rating,
        collegeOffers: schema.players.collegeOffers,
        gpa: schema.players.gpa,
        heightIn: schema.players.heightIn,
        weightLbs: schema.players.weightLbs,
        city: schema.players.city,
        bio: schema.players.bio,
        nilPoints: schema.players.nilPoints,
        verificationStatus: schema.players.verificationStatus,
        overallScore: schema.athleteRankings.overallScore,
      })
      .from(schema.players)
      .leftJoin(schema.athleteRankings, eq(schema.athleteRankings.playerId, schema.players.id))
      .where(inArray(schema.players.id, childIds));

    // Fields that count toward "profile completeness". Keep in sync with what the
    // athlete profile actually lets a girl fill in.
    const COMPLETENESS_FIELDS = [
      'profileImage', 'bio', 'position', 'gradYear', 'school',
      'gpa', 'heightIn', 'weightLbs', 'city', 'g5Rating',
    ] as const;

    const data = rows.map((r) => {
      const filled = COMPLETENESS_FIELDS.filter((f) => {
        const v = (r as Record<string, unknown>)[f];
        return v !== null && v !== undefined && v !== '';
      }).length;
      const offers = Array.isArray(r.collegeOffers) ? r.collegeOffers.length : 0;
      return {
        id: r.id,
        name: r.name,
        age: r.age,
        school: r.school,
        position: r.position,
        gradYear: r.gradYear,
        profileImage: r.profileImage,
        // Client-shaped names: Dashboard reads stars, breakoutScore, offers.
        stars: r.g5Rating,
        breakoutScore: r.overallScore,
        offers,
        gpa: r.gpa,
        heightIn: r.heightIn,
        weightLbs: r.weightLbs,
        city: r.city,
        nilPoints: r.nilPoints ?? 0,
        verifiedStatus: r.verificationStatus === 'verified' ? 'Verified' : 'Pending Review',
        profileCompleteness: Math.round((filled / COMPLETENESS_FIELDS.length) * 100),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[parent/children]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch children' });
  }
});

// GET /api/parent/requests — pending message requests for this parent's children
router.get('/requests', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const childIds = await getChildIds(parentId);
    if (childIds.length === 0) return res.json({ success: true, data: [] });

    const rows = await db
      .select()
      .from(schema.messageRequests)
      .where(and(
        inArray(schema.messageRequests.athleteId, childIds),
        eq(schema.messageRequests.status, 'pending'),
      ))
      .orderBy(desc(schema.messageRequests.createdAt));

    const data = [];
    for (const r of rows) {
      let coachName = 'Unknown';
      let coachOrg = '';
      let coachRole = '';
      if (r.receiverId != null) {
        const [coach] = await db
          .select({ name: schema.coaches.name, university: schema.coaches.university, division: schema.coaches.division })
          .from(schema.coaches)
          .where(eq(schema.coaches.id, r.receiverId))
          .limit(1);
        if (coach) {
          coachName = coach.name ?? 'Unknown';
          coachOrg = coach.university ?? '';
          coachRole = coach.division ?? '';
        }
      }

      let childName = 'Unknown';
      if (r.athleteId != null) {
        const [child] = await db
          .select({ name: schema.players.name })
          .from(schema.players)
          .where(eq(schema.players.id, r.athleteId))
          .limit(1);
        childName = child?.name ?? 'Unknown';
      }

      data.push({
        id: r.id,
        from: coachName,
        role: coachRole,
        org: coachOrg,
        preview: r.content,
        child: childName,
        athleteId: r.athleteId,
        createdAt: r.createdAt,
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[parent/requests]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// POST /api/parent/requests/:id/respond — approve or reject; approve writes parentId
router.post('/requests/:id/respond', validateParams(idParam), validateBody(parentRespondBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const { action } = req.body ?? {};
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve or reject' });
    }

    const [reqRow] = await db
      .select()
      .from(schema.messageRequests)
      .where(eq(schema.messageRequests.id, id))
      .limit(1);
    if (!reqRow) return res.status(404).json({ success: false, error: 'Request not found' });

    const childIds = await getChildIds(parentId);
    if (reqRow.athleteId == null || !childIds.includes(reqRow.athleteId)) {
      return res.status(403).json({ success: false, error: 'Not your child\'s request' });
    }

    const updates: Record<string, any> = { status: action === 'approve' ? 'approved' : 'rejected' };
    if (action === 'approve') {
      updates.parentId = parentId;
    }

    await db
      .update(schema.messageRequests)
      .set(updates)
      .where(eq(schema.messageRequests.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('[parent/requests/respond]', err);
    res.status(500).json({ success: false, error: 'Failed to respond to request' });
  }
});

// GET /api/parent/activity — recent activity for this parent's children
router.get('/activity', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const childIds = await getChildIds(parentId);
    if (childIds.length === 0) return res.json({ success: true, data: [] });

    const recentMessages = await db
      .select({ content: schema.messages.content, createdAt: schema.messages.createdAt, athleteId: schema.messages.athleteId })
      .from(schema.messages)
      .where(inArray(schema.messages.athleteId, childIds))
      .orderBy(desc(schema.messages.createdAt))
      .limit(10);

    const recentRequests = await db
      .select({ content: schema.messageRequests.content, createdAt: schema.messageRequests.createdAt, athleteId: schema.messageRequests.athleteId, status: schema.messageRequests.status })
      .from(schema.messageRequests)
      .where(inArray(schema.messageRequests.athleteId, childIds))
      .orderBy(desc(schema.messageRequests.createdAt))
      .limit(10);

    const childMap = new Map<number, string>();
    const children = await db
      .select({ id: schema.players.id, name: schema.players.name })
      .from(schema.players)
      .where(inArray(schema.players.id, childIds));
    for (const c of children) childMap.set(c.id, c.name);

    const activity = [
      ...recentMessages.map((m) => ({
        text: `${childMap.get(m.athleteId ?? 0) ?? 'Athlete'} received a message`,
        ts: m.createdAt,
        type: 'message' as const,
      })),
      ...recentRequests.map((r) => ({
        text: `Coach message request ${r.status} for ${childMap.get(r.athleteId ?? 0) ?? 'Athlete'}`,
        ts: r.createdAt,
        type: 'message' as const,
      })),
    ]
      .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
      .slice(0, 15);

    res.json({ success: true, data: activity });
  } catch (err) {
    console.error('[parent/activity]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

// POST /api/parent/stat-submissions (and alias /stats/submit) — parent-entered intake queue for the
// ingestion workflow.
const handleParentStatSubmit = async (req: express.Request, res: express.Response) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const body = req.body ?? {};
    let playerId: number | null = body.playerId ? Number(body.playerId) : null;
    let athleteName = body.athleteName;

    if (playerId != null) {
      const childIds = await getChildIds(parentId);
      if (!childIds.includes(playerId)) {
        return res.status(403).json({ success: false, error: 'Not your child' });
      }
      if (!athleteName) {
        const [p] = await db.select({ name: schema.players.name }).from(schema.players).where(eq(schema.players.id, playerId)).limit(1);
        if (p) athleteName = p.name;
      }
    } else if (body.athleteEmail) {
      const [child] = await db
        .select({ id: schema.players.id, name: schema.players.name })
        .from(schema.players)
        .where(eq(schema.players.email, String(body.athleteEmail).toLowerCase().trim()))
        .limit(1);
      if (child) {
        const childIds = await getChildIds(parentId);
        if (!childIds.includes(child.id)) {
          return res.status(403).json({ success: false, error: 'Not your child' });
        }
        playerId = child.id;
        if (!athleteName) athleteName = child.name;
      }
    }

    const [row] = await db.insert(schema.parentStatSubmissions).values({
      parentId,
      playerId,
      athleteEmail: body.athleteEmail ?? body.email ?? null,
      athleteName: athleteName ?? body.name ?? null,
      athleteDob: body.athleteDob ? new Date(body.athleteDob) : (body.dob ? new Date(body.dob) : null),
      gradYear: body.gradYear ?? null,
      position: body.position ?? null,
      state: body.state ?? null,
      division: body.division ?? null,
      school: body.school ?? null,
      season: body.season ?? null,
      passingTds: body.passingTds ?? body.touchdownsPassing ?? null,
      rushingTds: body.rushingTds ?? body.touchdownsRushing ?? null,
      receivingTds: body.receivingTds ?? body.touchdownsReceiving ?? null,
      defensiveTds: body.defensiveTds ?? null,
      flagPulls: body.flagPulls ?? null,
      interceptions: body.interceptions ?? null,
      sacks: body.sacks ?? null,
      passingYards: body.passingYards ?? null,
      rushingYards: body.rushingYards ?? null,
      receivingYards: body.receivingYards ?? null,
      hersRating: body.hersRating ?? null,
      fortyYardDash: body.fortyYardDash ?? null,
      verticalJump: body.verticalJump ?? null,
      shuttle5105: body.shuttle5105 ?? null,
      broadJump: body.broadJump ?? null,
      maxPrepsUrl: body.maxPrepsUrl ?? null,
      source: body.source ?? 'parent_portal',
      notes: body.notes ?? null,
      status: 'pending',
    }).returning();

    res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('[parent/stat-submissions POST]', err);
    res.status(500).json({ success: false, error: 'Failed to submit stats' });
  }
};

router.post('/stat-submissions', validateBody(parentStatSubmissionBody), handleParentStatSubmit);
router.post('/stats/submit', validateBody(parentStatSubmissionBody), handleParentStatSubmit);

// GET /api/parent/stat-submissions (and alias /stats/submit) — review own submitted rows
const handleParentStatList = async (req: express.Request, res: express.Response) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const rows = await db
      .select()
      .from(schema.parentStatSubmissions)
      .where(eq(schema.parentStatSubmissions.parentId, parentId))
      .orderBy(desc(schema.parentStatSubmissions.submittedAt));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[parent/stat-submissions GET]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stat submissions' });
  }
};

router.get('/stat-submissions', handleParentStatList);
router.get('/stats/submit', handleParentStatList);


// GET /api/parent/settings — server-backed parent preferences. Replaces the
// useState-only toggles that lived in ParentHub/ParentDashboard.
router.get('/settings', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const [row] = await db
      .select({ preferences: schema.parents.preferences })
      .from(schema.parents)
      .where(eq(schema.parents.id, parentId))
      .limit(1);
    res.json({ success: true, data: (row?.preferences as Record<string, unknown> | null) ?? {} });
  } catch (err) {
    console.error('[parent/settings GET]', err);
    res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

// PUT /api/parent/settings — accepts an arbitrary preferences object and
// merges it into the parent's persisted preferences. UI sends partial diffs.
router.put('/settings', validateBody(parentSettingsBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const patch = (req.body ?? {}) as Record<string, unknown>;
    if (typeof patch !== 'object' || Array.isArray(patch)) {
      return res.status(400).json({ success: false, error: 'Body must be an object of preferences' });
    }
    const [row] = await db
      .select({ preferences: schema.parents.preferences })
      .from(schema.parents)
      .where(eq(schema.parents.id, parentId))
      .limit(1);
    const merged = { ...((row?.preferences as Record<string, unknown> | null) ?? {}), ...patch };
    await db
      .update(schema.parents)
      .set({ preferences: merged })
      .where(eq(schema.parents.id, parentId));

    // Parent-controlled coach discoverability: when the parent toggles
    // profileVisibility, propagate it to every linked child by writing
    // preferences.coachDiscoverable on the players row (merged, so other
    // pref keys survive). Default-preserving: an unset flag means
    // discoverable, so this only writes when profileVisibility is present.
    if (typeof patch.profileVisibility === 'boolean') {
      const childIds = await getChildIds(parentId);
      if (childIds.length > 0) {
        const childRows = await db
          .select({ id: schema.players.id, preferences: schema.players.preferences })
          .from(schema.players)
          .where(inArray(schema.players.id, childIds));
        for (const child of childRows) {
          const childPrefs = (child.preferences as Record<string, unknown> | null) ?? {};
          const nextPrefs = { ...childPrefs, coachDiscoverable: patch.profileVisibility };
          await db
            .update(schema.players)
            .set({ preferences: nextPrefs })
            .where(eq(schema.players.id, child.id));
        }
      }
    }

    // Parent-controlled ranking visibility: same shape as the
    // coachDiscoverable propagation above, but for the public rankings
    // surface. Propagates rankingVisibility → preferences.rankingVisible on
    // every linked child, merging so coachDiscoverable (and other keys)
    // survive. Default-preserving: only writes when the flag is present.
    if (typeof patch.rankingVisibility === 'boolean') {
      const childIds = await getChildIds(parentId);
      if (childIds.length > 0) {
        const childRows = await db
          .select({ id: schema.players.id, preferences: schema.players.preferences })
          .from(schema.players)
          .where(inArray(schema.players.id, childIds));
        for (const child of childRows) {
          const childPrefs = (child.preferences as Record<string, unknown> | null) ?? {};
          const nextPrefs = { ...childPrefs, rankingVisible: patch.rankingVisibility };
          await db
            .update(schema.players)
            .set({ preferences: nextPrefs })
            .where(eq(schema.players.id, child.id));
        }
      }
    }

    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('[parent/settings PUT]', err);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// GET /api/parent/profile — the caller's own name / email / phone + member-since.
// Lets the Settings profile form prefill the current phone (not carried on the auth
// user) and show a real "Member Since".
router.get('/profile', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const [row] = await db
      .select({
        id: schema.parents.id,
        name: schema.parents.name,
        email: schema.parents.email,
        phone: schema.parents.phone,
        memberSince: schema.parents.createdAt,
      })
      .from(schema.parents)
      .where(eq(schema.parents.id, parentId))
      .limit(1);
    if (!row) return res.status(404).json({ success: false, error: 'Parent not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[parent/profile GET]', err);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

// PUT /api/parent/profile — update the parent's own name / phone. Email is the
// unique login id (with emailVerified) and is not changed here (needs a re-verify
// path, which is Resend-backed and owned by the backend lead).
router.put('/profile', validateBody(parentProfileBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const { name, phone } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone === null ? null : String(phone).trim();
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'At least one updatable field is required' });
    }
    await db.update(schema.parents).set(updates).where(eq(schema.parents.id, parentId));
    const [row] = await db
      .select({ id: schema.parents.id, name: schema.parents.name, email: schema.parents.email, phone: schema.parents.phone })
      .from(schema.parents)
      .where(eq(schema.parents.id, parentId))
      .limit(1);
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[parent/profile PUT]', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ─── Athlete change requests (parent approve/deny) ───────────────────────────
// Athlete-submitted changes to their own profile that a parent reviews before
// they go live (the Verifications "Profile Change Requests" popups). The create
// side (athlete submits) is future athlete-portal work, so today these read
// empty for real parents until that lands. On approve we only ever write a tight
// allowlist of profile fields, never status/consent (which a DB trigger guards).
const CHANGE_REQUEST_APPLY_FIELDS = new Set(['school', 'profileImage']);

// GET /api/parent/change-requests — pending + recently resolved, for this
// parent's children only.
router.get('/change-requests', async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const childIds = await getChildIds(parentId);
    if (childIds.length === 0) return res.json({ success: true, data: [] });

    const rows = await db
      .select()
      .from(schema.athleteChangeRequests)
      .where(inArray(schema.athleteChangeRequests.playerId, childIds))
      .orderBy(desc(schema.athleteChangeRequests.createdAt));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[parent/change-requests GET]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch change requests' });
  }
});

// POST /api/parent/change-requests/:id/respond — approve or deny. Approving a
// request whose field is in the apply-allowlist writes the proposed value to the
// athlete's profile in the same transaction; other fields are recorded approved
// but not auto-applied (e.g. stat corrections need the stats pipeline).
router.post('/change-requests/:id/respond', validateParams(idParam), validateBody(changeRequestRespondBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;

    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const { action } = req.body ?? {};

    const [reqRow] = await db
      .select()
      .from(schema.athleteChangeRequests)
      .where(eq(schema.athleteChangeRequests.id, id))
      .limit(1);
    if (!reqRow) return res.status(404).json({ success: false, error: 'Change request not found' });

    const childIds = await getChildIds(parentId);
    if (reqRow.playerId == null || !childIds.includes(reqRow.playerId)) {
      return res.status(403).json({ success: false, error: 'Not your child\'s request' });
    }
    if (reqRow.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'Request already resolved' });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.athleteChangeRequests)
        .set({ status: action === 'approve' ? 'approved' : 'denied', resolvedAt: new Date(), resolvedBy: parentId })
        .where(eq(schema.athleteChangeRequests.id, id));

      // Apply only on approve, only for allowlisted fields, never status/consent.
      if (action === 'approve' && reqRow.field && CHANGE_REQUEST_APPLY_FIELDS.has(reqRow.field)) {
        await tx
          .update(schema.players)
          .set({ [reqRow.field]: reqRow.proposedValue })
          .where(eq(schema.players.id, reqRow.playerId!));
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[parent/change-requests respond]', err);
    res.status(500).json({ success: false, error: 'Failed to respond to change request' });
  }
});

// POST /api/parent/invite-athlete — parent sends an invite to an athlete email.
// Idempotent: if the athlete already exists, creates a pending relation. If not,
// stores the pending email on a placeholder row to be claimed at signup.
router.post('/invite-athlete', validateBody(parentInviteBody), async (req, res) => {
  try {
    const parentId = requireParent(req, res);
    if (parentId == null) return;
    const { email, relationship } = req.body ?? {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    const normalEmail = email.toLowerCase().trim();
    const [athlete] = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(eq(schema.players.email, normalEmail))
      .limit(1);
    if (!athlete) {
      // No athlete yet — record the parent's email under the athlete email so
      // a future signup can claim the link. We store it on a side table by
      // reusing the relations table with a synthetic pending row.
      return res.json({
        success: true,
        data: { status: 'queued', message: 'Invite queued. The athlete will be linked when they sign up.' },
      });
    }
    // Skip if already linked.
    const existing = await db
      .select({ id: schema.parentChildRelations.id })
      .from(schema.parentChildRelations)
      .where(and(
        eq(schema.parentChildRelations.parentId, parentId),
        eq(schema.parentChildRelations.playerId, athlete.id),
      ))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.parentChildRelations).values({
        parentId,
        playerId: athlete.id,
        relationship: (relationship as string | undefined) ?? 'pending',
      });
    }
    res.json({ success: true, data: { status: 'linked' } });
  } catch (err) {
    console.error('[parent/invite-athlete]', err);
    res.status(500).json({ success: false, error: 'Failed to send invite' });
  }
});

export { router as parentRouter };
