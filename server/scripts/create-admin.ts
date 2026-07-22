import '../load-env';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { hashPassword } from '../auth';

// Usage:
//   DATABASE_URL=<railway-url> tsx scripts/create-admin.ts <email> <password> [role]
//   DATABASE_URL=<railway-url> ADMIN_EMAIL=.. ADMIN_PASSWORD=.. tsx scripts/create-admin.ts
//
// admin_users keys on `username`, which the login path resolves as the
// lowercased email (see findUserByEmail in authRoutes.ts). Idempotent: an
// existing row for the same email has its password and role reset.

async function main() {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? '').toLowerCase().trim();
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? '';
  const role = process.argv[4] ?? process.env.ADMIN_ROLE ?? 'admin';

  if (!email || !password) {
    console.error('Usage: tsx scripts/create-admin.ts <email> <password> [role]');
    console.error('   or set ADMIN_EMAIL / ADMIN_PASSWORD env vars');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Point it at the target database (e.g. Railway) before running.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const [existing] = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.username, email))
    .limit(1);

  if (existing) {
    await db
      .update(schema.adminUsers)
      .set({ passwordHash, role })
      .where(eq(schema.adminUsers.id, existing.id));
    console.log(`Updated existing admin: ${email} (role=${role})`);
  } else {
    await db.insert(schema.adminUsers).values({ username: email, passwordHash, role });
    console.log(`Created admin: ${email} (role=${role})`);
  }

  console.log('Log in at /admin with this email and password.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
