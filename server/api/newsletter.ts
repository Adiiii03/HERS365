import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { eq, gte } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { validateBody } from '../middleware/validate';
import { sendNewsletterConfirm, sendNewsletterWelcome } from '../email';
import { makeLimiterStore } from '../lib/limiterStore';

const router = express.Router();

// Cap subscribe attempts per IP so the endpoint cannot be scripted into a
// confirmation-mail cannon. Mirrors the registerLimiter pattern.
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  store: makeLimiterStore('newsletter-subscribe'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this network — try again later' },
});

// Per-destination cap: at most one confirmation send every 8 hours to a given
// pending row, plus a hard ceiling of MAX_SENDS_PER_WINDOW confirmation emails
// per real inbox per 24h. The inbox is identified by a normalized rate-limit
// key (see normalizeRateKey) that folds plus-tag and gmail-dot variants, so
// victim@gmail.com / victim+1@gmail.com / v.i.c.t.i.m@gmail.com all count as
// the same inbox and cannot be used to multiply the cap across rows or IPs.
// Enforced off consent_at (the last-send marker) in the table, not memory.
const RESEND_COOLDOWN_MS = 8 * 60 * 60 * 1000;
const SEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

// Fold abuse variants that all deliver to the same physical inbox. Strips any
// plus-tag (local part from '+' up to '@') and, for gmail/googlemail, removes
// dots from the local part. Used ONLY for the send cap key — the stored email
// stays exact so distinct legitimate non-gmail addresses never collide.
function normalizeRateKey(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return email;
  let local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus !== -1) local = local.slice(0, plus);
  if (GMAIL_DOMAINS.has(domain)) local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

// Count confirmation sends to this inbox in the last 24h by normalizing every
// recently-touched row's stored email to the same key. consent_at is bumped on
// every send, so rows with a consent_at inside the window represent sends.
async function sendsInWindow(email: string): Promise<number> {
  const key = normalizeRateKey(email);
  const since = new Date(Date.now() - SEND_WINDOW_MS);
  const rows = await db.select({
    email: schema.newsletterSubscribers.email,
    consentAt: schema.newsletterSubscribers.consentAt,
  }).from(schema.newsletterSubscribers)
    .where(gte(schema.newsletterSubscribers.consentAt, since));
  return rows.filter((r) => r.consentAt && normalizeRateKey(r.email) === key).length;
}

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(100).optional(),
  source: z.enum(['signup', 'footer', 'landing', 'coming_soon']),
});

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function confirmUrlFor(token: string) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/api/newsletter/confirm?token=${token}`;
}

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — H.E.R.S.365</title></head>
<body style="font-family: sans-serif; background: #0f0f0f; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="max-width: 480px; padding: 32px; text-align: center;">
    <h1 style="color: #ff6b35; font-size: 22px; margin-bottom: 12px;">H.E.R.S.365</h1>
    <h2 style="font-size: 19px; margin-bottom: 12px;">${title}</h2>
    <p style="color: #aaaaaa; line-height: 1.5;">${body}</p>
  </div>
</body>
</html>`;
}

// POST /api/newsletter/subscribe — double opt in start. Always returns the
// same generic 200 so the endpoint cannot be used to probe which emails exist.
router.post('/subscribe', subscribeLimiter, validateBody(subscribeSchema), async (req, res) => {
  try {
    const { email, name, source } = req.body as z.infer<typeof subscribeSchema>;

    const [existing] = await db.select().from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, email));

    if (existing) {
      if (existing.status === 'pending' && existing.confirmToken) {
        const lastSend = existing.consentAt ?? existing.createdAt;
        const cooledDown = !lastSend || Date.now() - new Date(lastSend).getTime() > RESEND_COOLDOWN_MS;
        if (cooledDown && await sendsInWindow(email) < MAX_SENDS_PER_WINDOW) {
          await db.update(schema.newsletterSubscribers)
            .set({ consentAt: new Date() })
            .where(eq(schema.newsletterSubscribers.id, existing.id));
          await sendNewsletterConfirm(email, existing.name ?? name ?? null, confirmUrlFor(existing.confirmToken));
        }
      }
      return res.json({ ok: true });
    }

    const confirmToken = newToken();
    const capReached = await sendsInWindow(email) >= MAX_SENDS_PER_WINDOW;
    await db.insert(schema.newsletterSubscribers).values({
      email,
      name: name ?? null,
      source,
      status: 'pending',
      confirmToken,
      unsubscribeToken: newToken(),
      // consent_at doubles as the last-send marker. Leave it unset when the
      // per-inbox cap suppresses the send so the row is not counted as a send.
      consentAt: capReached ? null : new Date(),
    });
    if (!capReached) {
      await sendNewsletterConfirm(email, name ?? null, confirmUrlFor(confirmToken));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[newsletter/subscribe]', err);
    res.json({ ok: true });
  }
});

// GET /api/newsletter/confirm?token= — lands from the email click, so respond
// with a human-readable page. Invalid or reused tokens get a generic page
// with no detail.
router.get('/confirm', async (req, res) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (token) {
      const [row] = await db.select().from(schema.newsletterSubscribers)
        .where(eq(schema.newsletterSubscribers.confirmToken, token));
      if (row && row.status === 'pending') {
        await db.update(schema.newsletterSubscribers)
          .set({ status: 'subscribed', confirmedAt: new Date() })
          .where(eq(schema.newsletterSubscribers.id, row.id));
        await sendNewsletterWelcome(row.email, row.name);
        return res.send(page("You're subscribed", 'Thanks for confirming. You will hear from us when there is real news about H.E.R.S.365 — no spam, and you can unsubscribe any time from the link in every email.'));
      }
      if (row && row.status === 'subscribed') {
        return res.send(page("You're subscribed", 'This email is already confirmed. Nothing more to do.'));
      }
    }
    res.send(page('Link expired', 'This confirmation link is no longer valid. If you want updates from H.E.R.S.365, sign up again from the website.'));
  } catch (err) {
    console.error('[newsletter/confirm]', err);
    res.send(page('Link expired', 'This confirmation link is no longer valid. If you want updates from H.E.R.S.365, sign up again from the website.'));
  }
});

// GET /api/newsletter/unsubscribe?token= — idempotent one-click out.
router.get('/unsubscribe', async (req, res) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (token) {
      const [row] = await db.select().from(schema.newsletterSubscribers)
        .where(eq(schema.newsletterSubscribers.unsubscribeToken, token));
      if (row) {
        if (row.status !== 'unsubscribed') {
          await db.update(schema.newsletterSubscribers)
            .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
            .where(eq(schema.newsletterSubscribers.id, row.id));
        }
        return res.send(page("You're unsubscribed", 'You will not receive any more emails from H.E.R.S.365. If this was a mistake, you can sign up again from the website.'));
      }
    }
    res.send(page('Link expired', 'This unsubscribe link is no longer valid. If you are still getting emails, contact us and we will remove you manually.'));
  } catch (err) {
    console.error('[newsletter/unsubscribe]', err);
    res.send(page('Link expired', 'This unsubscribe link is no longer valid. If you are still getting emails, contact us and we will remove you manually.'));
  }
});

export { router as newsletterRouter };
