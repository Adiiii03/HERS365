type HealthBody = {
  status?: string;
  db?: string;
  release?: {
    commit?: string | null;
    environment?: string | null;
  };
  integrations?: Record<string, boolean>;
  safety?: Record<string, boolean>;
};

const API_BASE = (process.env.API_BASE || 'https://hers365-api-production.up.railway.app').replace(/\/$/, '');
const EXPECTED_COMMIT = process.env.EXPECTED_COMMIT;
const EXPECT_REGISTRATION = process.env.EXPECT_REGISTRATION === 'true';
const EXPECT_GUARDIAN_EMAIL = process.env.EXPECT_GUARDIAN_EMAIL !== 'false';
const LIVE_SIGNUP_SMOKE = process.env.LIVE_SIGNUP_SMOKE === 'true';

const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) fail(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertTruthy(label: string, value: unknown) {
  if (!value) fail(`${label}: expected truthy value`);
}

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function checkHealth() {
  const { res, body } = await request('/health');
  if (!res.ok) {
    fail(`/health returned ${res.status}`);
    return null;
  }

  const health = body as HealthBody;
  assertEqual('/health status', health.status, 'ok');
  assertEqual('/health db', health.db, 'up');
  assertEqual('release.environment', health.release?.environment, 'production');

  if (EXPECTED_COMMIT) {
    const liveCommit = health.release?.commit ?? '';
    if (!liveCommit.startsWith(EXPECTED_COMMIT) && !EXPECTED_COMMIT.startsWith(liveCommit)) {
      fail(`release.commit: expected ${EXPECTED_COMMIT}, got ${liveCommit || 'missing'}`);
    }
  }

  assertEqual('integrations.email', health.integrations?.email, EXPECT_GUARDIAN_EMAIL);
  assertTruthy('integrations.redis', health.integrations?.redis);
  assertTruthy('integrations.anthropic', health.integrations?.anthropic);

  assertEqual('safety.productionEnv', health.safety?.productionEnv, true);
  assertEqual('safety.guardianEmail', health.safety?.guardianEmail, EXPECT_GUARDIAN_EMAIL);
  assertEqual('safety.sharedRateLimitsAndRevocation', health.safety?.sharedRateLimitsAndRevocation, true);
  assertEqual('safety.moderation', health.safety?.moderation, true);
  assertEqual('safety.frontendLinks', health.safety?.frontendLinks, true);
  assertEqual('safety.publicAthleteDiscovery', health.safety?.publicAthleteDiscovery, false);
  assertEqual('safety.mediaUploads', health.safety?.mediaUploads, false);
  assertEqual('safety.registration', health.safety?.registration, EXPECT_REGISTRATION);

  return health;
}

async function checkPublicExposureClosed() {
  const athletes = await request('/api/athletes');
  assertEqual('anonymous /api/athletes status', athletes.res.status, 401);

  const posts = await request('/api/posts');
  assertEqual('anonymous /api/posts status', posts.res.status, 401);
}

async function checkRegistrationGate() {
  const stamp = Date.now();
  const payload = {
    email: `smoke-athlete-${stamp}@example.test`,
    password: `Smoke-pass-${stamp}!`,
    name: 'Smoke Athlete',
    role: 'athlete',
    dob: '2010-01-01',
    guardianEmail: `smoke-guardian-${stamp}@example.test`,
  };

  const { res, body } = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!EXPECT_REGISTRATION) {
    assertEqual('closed registration status', res.status, 403);
    assertEqual('closed registration token', body?.token, undefined);
    return;
  }

  if (!LIVE_SIGNUP_SMOKE) {
    fail('EXPECT_REGISTRATION=true requires LIVE_SIGNUP_SMOKE=true so account creation is explicit');
    return;
  }

  assertEqual('guardian-gated registration status', res.status, 202);
  assertEqual('guardian-gated registration state', body?.status, 'pending_guardian');
  assertTruthy('guardian-gated pendingToken', body?.pendingToken);
  assertEqual('guardian-gated login token', body?.token, undefined);
}

async function main() {
  console.log(`[production-smoke] API_BASE=${API_BASE}`);
  await checkHealth();
  await checkPublicExposureClosed();
  await checkRegistrationGate();

  if (failures.length) {
    console.error('[production-smoke] FAILED');
    for (const item of failures) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log('[production-smoke] passed');
}

main().catch((err) => {
  console.error('[production-smoke] crashed:', err);
  process.exit(1);
});
