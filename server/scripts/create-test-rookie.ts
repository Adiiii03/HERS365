import { db } from '../db.js';
import { players, parents, parentChildRelations, guardianConsents } from '../schema.js';
import { hashPassword } from '../auth.js';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'rookie@hers365.com';
  const plainPassword = 'password123';

  // Delete existing to start fresh
  const existingPlayer = await db.query.players.findFirst({ where: (p, { eq }) => eq(p.email, email) });
  if (existingPlayer) {
    await db.delete(parentChildRelations).where(eq(parentChildRelations.playerId, existingPlayer.id));
    await db.delete(guardianConsents).where(eq(guardianConsents.playerId, existingPlayer.id));
    await db.delete(players).where(eq(players.id, existingPlayer.id));
  }
  await db.delete(parents).where(eq(parents.email, 'rookie_parent@hers365.com'));

  const hashedPassword = await hashPassword(plainPassword);

  // 1. Insert Parent
  const [parent] = await db.insert(parents).values({
    email: 'rookie_parent@hers365.com',
    name: 'Rookie Parent',
    passwordHash: hashedPassword,
    emailVerified: true
  }).returning();

  // 2. Insert Player (initially pending to avoid trigger)
  const [player] = await db.insert(players).values({
    email,
    passwordHash: hashedPassword,
    name: 'Test Rookie',
    role: 'athlete',
    subscriptionTier: 'free',
    verificationStatus: 'verified',
    emailVerified: true,
    status: 'pending_guardian',
    privacySetting: 'public'
  }).returning();

  // 3. Insert guardian consent
  const [consent] = await db.insert(guardianConsents).values({
    parentId: parent.id,
    playerId: player.id,
    consentType: 'platform_terms',
    framework: 'coppa',
    consented: true,
    consentVersion: '1.0',
    consentText: 'I consent to the platform terms',
    method: 'test_script'
  }).returning();

  // 4. Insert relation
  await db.insert(parentChildRelations).values({
    parentId: parent.id,
    playerId: player.id,
    relationship: 'parent',
    status: 'verified',
    consentId: consent.id
  });

  // 5. Upgrade player to active
  await db.update(players).set({ status: 'active' }).where(eq(players.id, player.id));

  console.log(`✅ Created test rookie account!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${plainPassword}`);
  process.exit(0);
}

main().catch(console.error);
