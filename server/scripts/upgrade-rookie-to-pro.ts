import { db } from '../db.js';
import { players } from '../schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  await db.update(players)
    .set({ subscriptionTier: 'pro' })
    .where(eq(players.email, 'rookie@hers365.com'));
  
  console.log('✅ rookie@hers365.com has been upgraded to PRO tier!');
  process.exit(0);
}

main().catch(console.error);
