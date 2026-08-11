import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, tokenFor } from './helpers/fixtures';
import { processStripeWebhookEvent } from '../paymentRoutes';
import { claimStripeEvent, markStripeEventProcessed } from '../lib/webhookDedupe';

// player_subscriptions.playerId previously had no unique constraint, so the
// onConflictDoUpdate({ target: playerId }) upserts below threw Postgres
// 42P10 ("no unique or exclusion constraint matching ON CONFLICT"). The
// webhook dedupe gate then masked the failure: it claims event.id before
// processing, so a retry after the throw was deduped into a silent 200.
// Net effect: a real charge with nothing recorded. Neither upsert was
// previously exercised by any test — stripeWebhookIdempotency.test.ts mocks
// the processor specifically to avoid this branch (see its comment), and
// paymentRoutes.test.ts only covers signature rejection and the /payments
// CRUD routes, never checkout. These tests call the real, unmocked code.

const app = createApp();
beforeEach(resetDb);

function makeCheckoutCompletedEvent(overrides: {
  playerId: number;
  planId: number;
  amountTotal?: number;
  subscriptionId?: string;
  customerId?: string;
}): Stripe.Event {
  return {
    id: `evt_test_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_fake',
        object: 'checkout.session',
        metadata: {
          playerId: String(overrides.playerId),
          planId: String(overrides.planId),
        },
        subscription: overrides.subscriptionId ?? 'sub_test_fake',
        amount_total: overrides.amountTotal ?? 999,
        currency: 'usd',
        payment_intent: 'pi_test_fake',
        customer: overrides.customerId ?? 'cus_test_fake',
      } as unknown as Stripe.Checkout.Session,
    },
  } as Stripe.Event;
}

async function makePlan(overrides: Partial<typeof schema.subscriptionPlans.$inferInsert> = {}) {
  const [row] = await db.insert(schema.subscriptionPlans).values({
    name: 'Pro',
    price: 999,
    tierLevel: 'pro',
    ...overrides,
  }).returning();
  return row;
}

describe('checkout.session.completed — real upsert (not mocked)', () => {
  it('creates a player_subscriptions row, a payments row, and updates the tier', async () => {
    const athlete = await makeAthlete();
    const plan = await makePlan();
    const event = makeCheckoutCompletedEvent({ playerId: athlete.id, planId: plan.id });

    await processStripeWebhookEvent(event);

    const [sub] = await db.select().from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, athlete.id));
    expect(sub).toBeTruthy();
    expect(sub.planId).toBe(plan.id);
    expect(sub.status).toBe('active');
    expect(sub.stripeSubscriptionId).toBe('sub_test_fake');

    const payments = await db.select().from(schema.payments)
      .where(eq(schema.payments.playerId, athlete.id));
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(999);
    expect(payments[0].status).toBe('completed');

    const [player] = await db.select().from(schema.players)
      .where(eq(schema.players.id, athlete.id));
    expect(player.subscriptionTier).toBe('pro');
  });

  it('upgrading plan updates the existing row instead of erroring on a second checkout', async () => {
    const athlete = await makeAthlete();
    const proPlan = await makePlan({ name: 'Pro', price: 999, tierLevel: 'pro' });
    const elitePlan = await makePlan({ name: 'Elite', price: 2999, tierLevel: 'elite' });

    await processStripeWebhookEvent(
      makeCheckoutCompletedEvent({ playerId: athlete.id, planId: proPlan.id, amountTotal: 999 }),
    );
    await processStripeWebhookEvent(
      makeCheckoutCompletedEvent({ playerId: athlete.id, planId: elitePlan.id, amountTotal: 2999, subscriptionId: 'sub_upgraded' }),
    );

    const subs = await db.select().from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, athlete.id));
    // Exactly one row per player — this is the behavior the missing unique
    // constraint made impossible to guarantee. Before the fix, the second
    // call here threw 42P10 instead of reaching this assertion.
    expect(subs).toHaveLength(1);
    expect(subs[0].planId).toBe(elitePlan.id);
    expect(subs[0].stripeSubscriptionId).toBe('sub_upgraded');

    const [player] = await db.select().from(schema.players)
      .where(eq(schema.players.id, athlete.id));
    expect(player.subscriptionTier).toBe('elite');
  });

  it('is safe to receive the same event twice through the real dedupe gate', async () => {
    const athlete = await makeAthlete();
    const plan = await makePlan();
    const event = makeCheckoutCompletedEvent({ playerId: athlete.id, planId: plan.id });

    // Mirrors the actual webhook route: claim, process, mark processed.
    // A retry of the same event.id must not double-insert a payment row.
    const first = await claimStripeEvent(event);
    expect(first.duplicate).toBe(false);
    await processStripeWebhookEvent(event);
    await markStripeEventProcessed(event.id);

    const second = await claimStripeEvent(event);
    expect(second.duplicate).toBe(true);
    // Duplicate short-circuits before processStripeWebhookEvent runs again —
    // asserting the route's own behavior, not calling the processor twice.

    const payments = await db.select().from(schema.payments)
      .where(eq(schema.payments.playerId, athlete.id));
    expect(payments).toHaveLength(1);
  });
});

describe('POST /api/payments/create-checkout-session — free tier (real upsert)', () => {
  it('activates a free plan directly without contacting Stripe', async () => {
    const athlete = await makeAthlete();
    const freePlan = await makePlan({ name: 'Rookie', price: 0, tierLevel: 'free' });

    const res = await request(app)
      .post('/api/payments/create-checkout-session')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ playerId: athlete.id, planId: freePlan.id });

    expect(res.status).toBe(200);
    expect(res.body.free).toBe(true);

    const [sub] = await db.select().from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, athlete.id));
    expect(sub).toBeTruthy();
    expect(sub.planId).toBe(freePlan.id);
    expect(sub.status).toBe('active');

    const [player] = await db.select().from(schema.players)
      .where(eq(schema.players.id, athlete.id));
    expect(player.subscriptionTier).toBe('free');
  });

  it('re-selecting the free plan updates the row instead of throwing', async () => {
    const athlete = await makeAthlete();
    const freePlan = await makePlan({ name: 'Rookie', price: 0, tierLevel: 'free' });
    const token = tokenFor(athlete, 'athlete');

    const first = await request(app)
      .post('/api/payments/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: athlete.id, planId: freePlan.id });
    expect(first.status).toBe(200);

    // Before the fix, this second call hit the same onConflictDoUpdate and
    // threw 42P10 — this is the exact path a free-tier Rookie signup takes.
    const second = await request(app)
      .post('/api/payments/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: athlete.id, planId: freePlan.id });
    expect(second.status).toBe(200);

    const subs = await db.select().from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, athlete.id));
    expect(subs).toHaveLength(1);
  });
});