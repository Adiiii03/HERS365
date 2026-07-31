export function isExplicitNonProdEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.APP_ENV ?? env.NODE_ENV;
  return value === 'development' || value === 'test';
}

export function publicAthleteDiscoveryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PUBLIC_ATHLETE_DISCOVERY_ENABLED === 'true') return true;
  if (env.PUBLIC_ATHLETE_DISCOVERY_ENABLED === 'false') return false;
  return isExplicitNonProdEnv(env);
}
