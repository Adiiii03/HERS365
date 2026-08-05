// @ts-nocheck
import '../load-env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { like, inArray } from 'drizzle-orm';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('postgres') ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

async function cleanDemo() {
  console.log('🧹 Finding demo athletes...');
  
  const players = await db.select({ id: schema.players.id }).from(schema.players).where(like(schema.players.email, '%@hers365.com'));
  const playerIds = players.map(p => p.id);
  
  if (playerIds.length === 0) {
    console.log('✅ No demo athletes found!');
    process.exit(0);
  }

  console.log(`Found ${playerIds.length} demo athletes. Cleaning up dependencies...`);

  await db.delete(schema.athleteRankings).where(inArray(schema.athleteRankings.playerId, playerIds));
  await db.delete(schema.combineStats).where(inArray(schema.combineStats.playerId, playerIds));
  await db.delete(schema.gameStats).where(inArray(schema.gameStats.playerId, playerIds));
  await db.delete(schema.parentStatSubmissions).where(inArray(schema.parentStatSubmissions.playerId, playerIds));
  await db.delete(schema.parentChildRelations).where(inArray(schema.parentChildRelations.playerId, playerIds));
  await db.delete(schema.guardianConsents).where(inArray(schema.guardianConsents.playerId, playerIds));
  
  await db.delete(schema.players).where(inArray(schema.players.id, playerIds));

  console.log('✅ Successfully removed all demo athletes and kept only the real roster athletes!');
  process.exit(0);
}

cleanDemo().catch(console.error);
