import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
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

// Per-destination cap: at most one confirmation send every 8 hours, so a
// victim inbox sees at most 3 confirmation emails in any 24h window even
// across IPs. Enforced off consent_at in the table, not memory.
const RESEND_COOLDOWN_MS = 8 * 60 * 60 * 1000;

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
        if (!lastSend || Date.now() - new Date(lastSend).getTime() > RESEND_COOLDOWN_MS) {
          await db.update(schema.newsletterSubscribers)
            .set({ consentAt: new Date() })
            .where(eq(schema.newsletterSubscribers.id, existing.id));
          await sendNewsletterConfirm(email, existing.name ?? name ?? null, confirmUrlFor(existing.confirmToken));
        }
      }
      return res.json({ ok: true });
    }

    const confirmToken = newToken();
    await db.insert(schema.newsletterSubscribers).values({
      email,
      name: name ?? null,
      source,
      status: 'pending',
      confirmToken,
      unsubscribeToken: newToken(),
      consentAt: new Date(),
    });
    await sendNewsletterConfirm(email, name ?? null, confirmUrlFor(confirmToken));

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
