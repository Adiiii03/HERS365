// Shared Redis-backed store for express-rate-limit so limits hold across
// Railway instances. When REDIS_URL is unset (dev/test/CI), returns undefined
// and express-rate-limit falls back to its per-process memory store.
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, redisEnabled } from '../redis';

export function makeLimiterStore(prefix: string): RedisStore | undefined {
  if (!redisEnabled()) return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: async (...args: string[]) => {
      const client = await getRedisClient();
      return client.sendCommand(args);
    },
  });
}
