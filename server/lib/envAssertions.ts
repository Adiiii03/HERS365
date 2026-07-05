// Production env assertions (PRD section 7 item 11). Exported as a pure
// function of the env so core-server.ts can fail fast at boot and tests can
// exercise it without starting the listener.
export function isProductionEnv(env: NodeJS.ProcessEnv): boolean {
  return env.APP_ENV === 'production' || (!env.APP_ENV && env.NODE_ENV === 'production');
}

export function assertProductionEnv(env: NodeJS.ProcessEnv): void {
  if (!isProductionEnv(env)) return;

  const problems: string[] = [];

  if (env.APP_ENV !== 'production') {
    problems.push('APP_ENV must be explicitly set to "production" (NODE_ENV alone is not enough — the env guards key off APP_ENV)');
  }
  if (!env.CORS_ORIGIN) {
    problems.push('CORS_ORIGIN must be set to the production frontend origin');
  } else if (/localhost|127\.0\.0\.1/i.test(env.CORS_ORIGIN)) {
    problems.push(`CORS_ORIGIN must not be a localhost value (got "${env.CORS_ORIGIN}")`);
  }
  if (!env.REDIS_URL) {
    problems.push('REDIS_URL must be set (shared rate-limit store + token revocation)');
  }
  if (!env.CODE_PEPPER || env.CODE_PEPPER.length < 32) {
    problems.push(`CODE_PEPPER must be set and at least 32 characters (got ${env.CODE_PEPPER ? `${env.CODE_PEPPER.length} chars` : 'unset'})`);
  }
  if (env.SMS_ENABLED === 'true') {
    for (const v of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM']) {
      if (!env[v]) problems.push(`${v} must be set when SMS_ENABLED=true`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Production environment misconfigured:\n- ${problems.join('\n- ')}`);
  }
}
