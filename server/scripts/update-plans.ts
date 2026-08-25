import { db } from './db';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function updatePlans() {
  console.log('🌱 Updating subscription plans to new tiers...');

  // Delete all existing plans
  await db.delete(schema.subscriptionPlans);

  // Insert new plans
  await db.insert(schema.subscriptionPlans).values([
    { name: 'Rookie', price: 0, tierLevel: 'free' },
    { name: 'Pro', price: 2999, tierLevel: 'pro' },
    { name: 'Elite', price: 6999, tierLevel: 'elite' },
    { name: 'Elite Yearly', price: 49999, tierLevel: 'elite' },
  ]);

  console.log('✅ Subscription plans updated successfully!');
  process.exit(0);
}

updatePlans().catch(err => {
  console.error('Failed to update plans:', err);
  process.exit(1);
});
