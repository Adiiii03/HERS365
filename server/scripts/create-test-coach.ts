import { db } from '../db.js';
import { coaches } from '../schema.js';
import { hashPassword } from '../auth.js';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'coach@hers365.com';
  const plainPassword = 'password123';

  // Delete existing to start fresh
  await db.delete(coaches).where(eq(coaches.email, email));

  const hashedPassword = await hashPassword(plainPassword);

  // Insert fully verified coach
  await db.insert(coaches).values({
    email,
    name: 'Test Coach',
    passwordHash: hashedPassword,
    university: 'Test University',
    division: 'D1',
    verifiedStatus: true,
    verifiedAt: new Date()
  });

  console.log(`✅ Created verified test coach account!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${plainPassword}`);
  process.exit(0);
}

main().catch(console.error);
