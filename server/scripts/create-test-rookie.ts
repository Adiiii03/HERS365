import { db } from '../db.js';
import { players } from '../schema.js';
import { hashPassword } from '../auth.js';

async function main() {
  const email = 'rookie@hers365.com';
  const plainPassword = 'password123';

  // Check if exists
  const existing = await db.query.players.findFirst({
    where: (p, { eq }) => eq(p.email, email)
  });

  if (existing) {
    console.log(`Test user already exists: ${email}`);
    process.exit(0);
  }

  const hashedPassword = await hashPassword(plainPassword);

  await db.insert(players).values({
    email,
    passwordHash: hashedPassword,
    name: 'Test Rookie',
    role: 'athlete',
    subscriptionTier: 'free',
    verificationStatus: 'verified',
    emailVerified: true,
    status: 'pending_guardian', // Bypasses the trigger while still letting them log in
    privacySetting: 'public'
  });

  console.log(`✅ Created test rookie account!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${plainPassword}`);
  process.exit(0);
}

main().catch(console.error);
