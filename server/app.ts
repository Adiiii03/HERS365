import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { makeLimiterStore } from './lib/limiterStore';

import coachRouter from './coachRoutes';
import paymentRouter from './paymentRoutes';
import authRoutesRouter from './authRoutes';
import adminRouter from './adminRoutes';
import uploadRouter from './uploadRoutes';
import emailAuthRouter from './emailAuthRoutes';
import mainApiRouter from './routes';
import { rankingsRouter } from './api/rankings';
import { athletesRouter } from './api/athletes';
import { messagesRouter } from './api/messages';
import { trainingRouter } from './api/training';
import { usersRouter } from './api/users';
import { programsRouter } from './api/programs';
import { coachesRouter } from './api/coaches';
import { parentRouter } from './api/parent';
import eventRouter from './eventRoutes';
import { scholarshipsRouter } from './api/scholarships';
import { storiesRouter } from './api/stories';
import { followsRouter } from './api/follows';
import { badgesRouter } from './api/badges';
import { faqsRouter } from './api/faqs';
import { contactRouter } from './api/contact';
import { newsletterRouter } from './api/newsletter';
import { adminStatsRouter } from './api/admin';
import { leaguesRouter } from './api/leagues';
import { teamsRouter } from './api/teams';
import { errorsRouter } from './api/errors';
import { guardianRouter } from './api/guardian';
import errorHandler from './middleware/errorHandler';
import { pool } from './db';
import { publicAthleteDiscoveryEnabled } from './lib/publicExposure';
import { isMediaUploadEnabled } from './lib/mediaUpload';
import { isRegistrationEnabled } from './lib/registration';

function currentCommitSha(): string | null {
  return process.env.RAILWAY_GIT_COMMIT_SHA
    || process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || process.env.SOURCE_COMMIT
    || null;
}

export function createApp() {
  const app = express();

  // Railway fronts the app with exactly one proxy hop, so trust exactly that
  // hop: req.ip becomes the rightmost X-Forwarded-For entry (Railway-appended)
  // and attacker-prepended entries are ignored. 'trust proxy true' would let a
  // spoofed XFF defeat every IP-keyed rate limit. Env-overridable in case the
  // hop count ever changes (e.g. a CDN in front).
  const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
  app.set('trust proxy', isNaN(trustProxyHops) ? 1 : trustProxyHops);

  app.use(helmet({
    hsts: { maxAge: 15552000, includeSubDomains: true },
    // API serves JSON plus the newsletter confirm/unsubscribe HTML pages,
    // which use inline styles only — everything else is locked down.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        styleSrc: ["'unsafe-inline'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
  }));
  app.use(cors({
    origin: (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',').map(o => o.trim()),
    credentials: true,
  }));

  // Stripe signature verification needs to unparsed body.
  // Thus precede express.json
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '5mb' }));

  // Loose global ceiling so unauthenticated reads cannot be scraped at scale.
  // Per-endpoint limiters stay the primary control. Skipped under test unless
  // a test opts in by setting GLOBAL_RATE_LIMIT_MAX.
  const globalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: () => {
      const raw = Number(process.env.GLOBAL_RATE_LIMIT_MAX);
      return Number.isFinite(raw) && raw > 0 ? raw : 600;
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: makeLimiterStore('global'),
    skip: () =>
      (process.env.APP_ENV ?? process.env.NODE_ENV) === 'test' &&
      !process.env.GLOBAL_RATE_LIMIT_MAX,
    message: { error: 'Too many requests — slow down' },
  });
  app.use('/api', globalLimiter);

  // Public health probe — used by Railway's deploy healthcheck (so a crash-looping
  // deploy is never promoted, the previous good one keeps serving) and by the
  // HERS365-HQ dashboard. CORS-open so the local dashboard file can read it.
  // Returns 200 whenever the app is responding; reports DB reachability in the
  // body rather than failing the probe, so a transient DB blip mid-deploy does
  // not reject an otherwise-healthy release.
  app.get('/health', async (_req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    let db = 'down';
    try { await pool.query('SELECT 1'); db = 'up'; } catch { /* db unreachable */ }
    const frontendUrl = process.env.FRONTEND_URL;
    res.json({
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      release: {
        commit: currentCommitSha(),
        environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? null,
      },
      integrations: {
        stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        email: Boolean(process.env.RESEND_API_KEY),
        redis: Boolean(process.env.REDIS_URL),
        maxpreps: Boolean(process.env.MAXPREPS_API_KEY),
        'google-oauth': Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL),
        'github-oauth': Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL),
      },
      safety: {
        productionEnv: (process.env.APP_ENV ?? process.env.NODE_ENV) === 'production',
        guardianEmail: Boolean(process.env.RESEND_API_KEY),
        sharedRateLimitsAndRevocation: Boolean(process.env.REDIS_URL),
        moderation: Boolean(process.env.ANTHROPIC_API_KEY),
        frontendLinks: Boolean(frontendUrl) && !/localhost|127\.0\.0\.1/i.test(frontendUrl!),
        publicAthleteDiscovery: publicAthleteDiscoveryEnabled(),
        mediaUploads: isMediaUploadEnabled(),
        registration: isRegistrationEnabled(),
      },
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
    });
  });

  // Client error sink — mounted before every other /api/* router so an auth
  // crash on a pre-login page still reports up. No auth, allow-list schema,
  // rate limited. See server/api/errors.ts.
  app.use('/api/errors', errorsRouter);

  app.use('/api/payments', paymentRouter);
  app.use('/api/rankings', rankingsRouter);
  app.use('/api/athletes', athletesRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/training', trainingRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/programs', programsRouter);
  app.use('/api/coaches', coachesRouter);
  app.use('/api/parent', parentRouter);
  app.use('/api/coach', coachRouter);
  app.use('/api/auth/guardian', guardianRouter);
  app.use('/api/auth', authRoutesRouter);
  app.use('/api/auth/secure', authRoutesRouter);
  app.use('/api/auth/email', emailAuthRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/data', adminStatsRouter);
  app.use('/api/events', eventRouter);
  app.use('/api/scholarships', scholarshipsRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/follows', followsRouter);
  app.use('/api/badges', badgesRouter);
  app.use('/api/faqs', faqsRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/newsletter', newsletterRouter);
  app.use('/api/leagues', leaguesRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api', mainApiRouter);

  // Final middleware: catches anything a route forwarded via next(err), logs
  // it server-side with a request id, and returns a generic 500 to the client.
  app.use(errorHandler);

  return app;
}
