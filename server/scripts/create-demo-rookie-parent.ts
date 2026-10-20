// Demo setup: ensure `rookie_parent@hers365.com` exists as a CHILDLESS parent account.
//
// This is the live-site parent-portal demo account. It must have NO linked child so that
// GET /api/parent/children returns empty and the frontend demo layer renders its rich
// mock child (DEFAULT_CHILD) plus the sample surroundings. The client only renders that
// mock for this specific email (see client/src/components/parent/demoParent.ts).
//
// Idempotent: creates the parent if missing, and strips any existing child link if the
// account was previously set up with one (e.g. by scripts/create-test-rookie.ts).
//
// Intended for local dev and the demo deployment. Run with:
//   tsx server/scripts/create-demo-rookie-parent.ts
import { db } from '../db.js';
import { parents, parentChildRelations } from '../schema.js';
import { hashPassword } from '../auth.js';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'rookie_parent@hers365.com';
  const plainPassword = 'password123';
  const passwordHash = await hashPassword(plainPassword);

  const [existing] = await db.select().from(parents).where(eq(parents.email, email)).limit(1);

  let parentId: number;
  if (existing) {
    parentId = existing.id;
    // Strip any linked children so /children is empty and the demo mock renders.
    await db.delete(parentChildRelations).where(eq(parentChildRelations.parentId, parentId));
    await db
      .update(parents)
      .set({ passwordHash, name: 'Rookie Parent', emailVerified: true })
      .where(eq(parents.id, parentId));
    console.log(`✅ Updated demo parent ${email} (childless, password reset)`);
  } else {
    const [created] = await db
      .insert(parents)
      .values({ email, name: 'Rookie Parent', passwordHash, emailVerified: true })
      .returning();
    parentId = created.id;
    console.log(`✅ Created demo parent ${email}`);
  }

  console.log(`Email:    ${email}`);
  console.log(`Password: ${plainPassword}`);
  console.log(`Linked children: 0 (demo mock renders from the frontend)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to set up demo rookie parent:', err);
  process.exit(1);
});
