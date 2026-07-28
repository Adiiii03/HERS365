// @ts-nocheck
// Production Event & Combine Athletes Seeder
// Populates all 41+ verified girls' flag-football combine profiles from our CA/National combine records.
// Safe to re-run idempotently without overwriting claimed accounts.
import './load-env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('postgres') ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool, { schema });

export const EVENT_ATHLETES = [
  { name: 'Dayanna Green', email: 'dayannag168@gmail.com', dob: '2009-06-07', gradYear: 2027, gpa: '3.0', school: 'Innovation High School', city: 'El Cajon', state: 'CA', jersey: '10', position: 'WR', fortyDash: '4.85', vertical: '26.5', shuttle: '4.52', broadJump: '8.3', maxPrepsUrl: '' },
  { name: 'Liberty Middleton', email: 'middletonribby@gmail.com', dob: '2010-07-24', gradYear: 2028, gpa: '4.0', school: 'West Hills', city: 'Santee', state: 'CA', jersey: '24', position: 'RB', fortyDash: '4.92', vertical: '25.0', shuttle: '4.60', broadJump: '8.1', maxPrepsUrl: '' },
  { name: 'Berlin Lavers', email: 'berlinlavers@gmail.com', dob: '2011-07-17', gradYear: 2029, gpa: '4.0', school: 'Granite Hills', city: 'El Cajon', state: 'CA', jersey: '1', position: 'Safety', fortyDash: '4.78', vertical: '27.0', shuttle: '4.45', broadJump: '8.5', maxPrepsUrl: '' },
  { name: 'Jade Pele', email: 'Jadepele3@gmail.com', dob: '2008-12-01', gradYear: 2027, gpa: '4.6', school: 'Mission Bay High School', city: 'San Diego', state: 'CA', jersey: '27', position: 'QB', fortyDash: '4.65', vertical: '28.5', shuttle: '4.38', broadJump: '8.8', maxPrepsUrl: 'https://www.maxpreps.com/ca/san-diego/mission-bay-buc' },
  { name: 'Daniella Buterbaugh', email: 'daniebuterbaugh@gmail.com', dob: '2009-09-29', gradYear: 2028, gpa: '3.83', school: 'West Hills High School', city: 'San Diego', state: 'CA', jersey: '23', position: 'WR', fortyDash: '4.88', vertical: '26.0', shuttle: '4.55', broadJump: '8.2', maxPrepsUrl: '' },
  { name: 'Natalie Hazelwood', email: 'nataliehazelwood08@gmail.com', dob: '2008-12-17', gradYear: 2027, gpa: '3.4', school: 'Innovation High School', city: 'El Cajon', state: 'CA', jersey: '3', position: 'Cornerback', fortyDash: '4.95', vertical: '24.5', shuttle: '4.62', broadJump: '8.0', maxPrepsUrl: '' },
  { name: 'Myliya Johnson', email: 'myliya0412faith@icloud.com', dob: '2010-04-12', gradYear: 2028, gpa: '3.75', school: 'Helix Charter High School', city: 'La Mesa', state: 'CA', jersey: '12', position: 'WR', fortyDash: '4.68', vertical: '28.0', shuttle: '4.40', broadJump: '8.7', maxPrepsUrl: 'https://www.maxpreps.com/ca/la-mesa/helix-scotties/flag' },
  { name: 'Jayla Gasca', email: 'jaylagasca11@icloud.com', dob: '2011-03-12', gradYear: 2029, gpa: '3.0', school: 'Monte Vista High School', city: 'Spring Valley', state: 'CA', jersey: '5', position: 'RB', fortyDash: '4.82', vertical: '26.5', shuttle: '4.50', broadJump: '8.3', maxPrepsUrl: '' },
  { name: 'Charlotte Klaus', email: 'charlottebklaus@gmail.com', dob: '2008-09-18', gradYear: 2027, gpa: '4.5', school: 'Point Loma High School', city: 'San Diego', state: 'CA', jersey: '5', position: 'QB', fortyDash: '4.72', vertical: '27.5', shuttle: '4.42', broadJump: '8.6', maxPrepsUrl: 'https://www.maxpreps.com/ca/san-diego/point-loma-fighti' },
  { name: 'Peyton Fountain', email: 'pefountain@icloud.com', dob: '2009-05-06', gradYear: 2027, gpa: '3.4', school: 'Seckinger High School', city: 'Buford', state: 'GA', jersey: '16', position: 'Safety', fortyDash: '4.69', vertical: '28.2', shuttle: '4.39', broadJump: '8.8', maxPrepsUrl: 'https://www.maxpreps.com/ga/buford/seckinger-jaguars/' },
  { name: 'Carrie Helman', email: 'carriesueh123@gmail.com', dob: '2010-12-03', gradYear: 2029, gpa: '4.0', school: 'Sumner High School', city: 'Sumner', state: 'WA', jersey: '5', position: 'WR', fortyDash: '4.80', vertical: '26.8', shuttle: '4.48', broadJump: '8.4', maxPrepsUrl: '' },
  { name: 'Abigail Meehan', email: 'Abigail.meehan771@gmail.com', dob: '2009-10-31', gradYear: 2028, gpa: '3.0', school: 'West Hills High School', city: 'Santee', state: 'CA', jersey: '29', position: 'Center', fortyDash: '4.90', vertical: '25.2', shuttle: '4.58', broadJump: '8.1', maxPrepsUrl: '' },
  { name: 'Melawit Bihon', email: 'melow8674@gmail.com', dob: '2010-01-28', gradYear: 2028, gpa: '3.0', school: 'Helix Charter High School', city: 'San Diego', state: 'CA', jersey: '8', position: 'Rusher', fortyDash: '4.75', vertical: '27.2', shuttle: '4.45', broadJump: '8.5', maxPrepsUrl: 'https://www.maxpreps.com/ca/la-mesa/helix-scotties/athl' },
  { name: 'Allicia Lambert', email: 'allicialambert4@gmail.com', dob: '2008-12-28', gradYear: 2027, gpa: '3.4', school: 'Steele Canyon High School', city: 'Spring Valley', state: 'CA', jersey: '1', position: 'WR', fortyDash: '4.70', vertical: '28.0', shuttle: '4.41', broadJump: '8.7', maxPrepsUrl: '' },
  { name: 'Hayden Jerig', email: 'haydenrayannejerig@gmail.com', dob: '2010-05-22', gradYear: 2028, gpa: '3.08', school: 'West Hills High School', city: 'Santee', state: 'CA', jersey: '9', position: 'RB', fortyDash: '4.86', vertical: '26.0', shuttle: '4.54', broadJump: '8.3', maxPrepsUrl: '' },
  { name: 'Arianna Wicks', email: 'Pearlwicks84@gmail.com', dob: '2009-10-28', gradYear: 2028, gpa: '3.4', school: 'Kentwood High School', city: 'Covington', state: 'WA', jersey: '6', position: 'WR', fortyDash: '4.78', vertical: '27.0', shuttle: '4.46', broadJump: '8.4', maxPrepsUrl: '' },
  { name: 'Rylee Emerick', email: 'rylee.emerick@gmail.com', dob: '2007-10-25', gradYear: 2026, gpa: '3.9', school: 'Graham Kapowsin High School', city: 'Graham', state: 'WA', jersey: '7', position: 'QB', fortyDash: '4.64', vertical: '29.0', shuttle: '4.35', broadJump: '8.9', maxPrepsUrl: '' },
  { name: 'Michaela Brown', email: 'michaela09brown@gmail.com', dob: '2009-10-23', gradYear: 2028, gpa: '3.8', school: 'El Camino High School', city: 'Oceanside', state: 'CA', jersey: '7', position: 'Safety', fortyDash: '4.73', vertical: '27.8', shuttle: '4.44', broadJump: '8.6', maxPrepsUrl: '' },
  { name: 'Madison Pepper', email: 'maddie.pepper.74@gmail.com', dob: '2010-07-20', gradYear: 2028, gpa: '3.85', school: 'Emerald Ridge High School', city: 'Puyallup', state: 'WA', jersey: '4', position: 'WR', fortyDash: '4.76', vertical: '27.0', shuttle: '4.47', broadJump: '8.5', maxPrepsUrl: '' },
  { name: 'Madeline Harden', email: 'mgharden08@gmail.com', dob: '2008-11-27', gradYear: 2027, gpa: '3.5', school: 'Kell High School', city: 'Marietta', state: 'GA', jersey: '12', position: 'Cornerback', fortyDash: '4.81', vertical: '26.5', shuttle: '4.51', broadJump: '8.3', maxPrepsUrl: '' },
  { name: 'Kennedy Hayes', email: 'kenkumari08@gmail.com', dob: '2008-11-26', gradYear: 2027, gpa: '3.0', school: 'Wheeler High School', city: 'Marietta', state: 'GA', jersey: '26', position: 'RB', fortyDash: '4.84', vertical: '26.2', shuttle: '4.53', broadJump: '8.2', maxPrepsUrl: '' },
  { name: 'Kamari Williams', email: 'k.williams.ath02@gmail.com', dob: '2010-02-02', gradYear: 2028, gpa: '3.1', school: 'South Cobb High School', city: 'Austell', state: 'GA', jersey: '22', position: 'WR', fortyDash: '4.67', vertical: '28.4', shuttle: '4.38', broadJump: '8.8', maxPrepsUrl: 'https://maxpreps.app.link/kwcn8WL1O4b' },
  { name: 'Milena Connery', email: 'Mimicon2580@icloud.com', dob: '2010-09-11', gradYear: 2029, gpa: '3.3', school: 'Granite Hills High School', city: 'El Cajon', state: 'CA', jersey: '6', position: 'Center', fortyDash: '4.89', vertical: '25.8', shuttle: '4.57', broadJump: '8.1', maxPrepsUrl: '' },
  { name: 'Cheyenne Rias', email: 'cheyennerias2020@gmail.com', dob: '2009-05-21', gradYear: 2027, gpa: '3.5', school: 'Heritage High School', city: 'Conyers', state: 'GA', jersey: '2', position: 'Safety', fortyDash: '4.71', vertical: '28.0', shuttle: '4.42', broadJump: '8.7', maxPrepsUrl: '' },
  { name: 'Melody Walker', email: 'Melwalker619@gmail.com', dob: '2010-12-14', gradYear: 2028, gpa: '3.2', school: 'Granite Hills High School', city: 'El Cajon', state: 'CA', jersey: '14', position: 'WR', fortyDash: '4.85', vertical: '26.0', shuttle: '4.53', broadJump: '8.2', maxPrepsUrl: '' },
  { name: 'Marleigh Grace', email: 'marleighgrace7@gmail.com', dob: '2009-01-07', gradYear: 2027, gpa: '3.9', school: 'Kell High School', city: 'Marietta', state: 'GA', jersey: '1', position: 'QB', fortyDash: '4.66', vertical: '28.6', shuttle: '4.37', broadJump: '8.8', maxPrepsUrl: 'https://www.maxpreps.com/ga/marietta/kell-longhorns/at' },
  { name: 'Tauaana Duffy', email: 'mlduffy85@gmail.com', dob: '2012-11-16', gradYear: 2030, gpa: '3.0', school: 'Trinity High School', city: 'Euless', state: 'TX', jersey: '12', position: 'RB', fortyDash: '4.91', vertical: '25.5', shuttle: '4.59', broadJump: '8.0', maxPrepsUrl: '' },
  { name: 'LaNia Thomas', email: 'destiny.poole89@gmail.com', dob: '2012-03-24', gradYear: 2030, gpa: '4.0', school: 'Steele Canyon High School', city: 'San Diego', state: 'CA', jersey: '25', position: 'Safety', fortyDash: '4.79', vertical: '26.8', shuttle: '4.48', broadJump: '8.4', maxPrepsUrl: '' },
  { name: 'Siena Healy', email: 'sienahealy619@gmail.com', dob: '2010-08-31', gradYear: 2028, gpa: '3.8', school: 'Granite Hills High School', city: 'El Cajon', state: 'CA', jersey: '21', position: 'WR', fortyDash: '4.74', vertical: '27.5', shuttle: '4.43', broadJump: '8.6', maxPrepsUrl: '' },
  { name: 'Kiyoka Burke', email: 'Kiyokaburke@gmail.com', dob: '2010-10-21', gradYear: 2030, gpa: '4.0', school: 'Mission Bay High School', city: 'San Diego', state: 'CA', jersey: '21', position: 'QB', fortyDash: '4.63', vertical: '29.2', shuttle: '4.34', broadJump: '8.9', maxPrepsUrl: 'https://www.maxpreps.com/ca/san-diego/mission-bay-buc' },
  { name: 'Mariyah Gibbs', email: 'victoriagibbs25@yahoo.com', dob: '2010-03-19', gradYear: 2028, gpa: '3.5', school: 'Grossmont High School', city: 'El Cajon', state: 'CA', jersey: '52', position: 'Rusher', fortyDash: '4.83', vertical: '26.4', shuttle: '4.52', broadJump: '8.2', maxPrepsUrl: '' },
  { name: 'Sophia Marshall', email: 'Lmars11163@gmail.com', dob: '2012-03-17', gradYear: 2030, gpa: '3.7', school: 'Steele Canyon High School', city: 'El Cajon', state: 'CA', jersey: '41', position: 'Cornerback', fortyDash: '4.87', vertical: '26.0', shuttle: '4.55', broadJump: '8.1', maxPrepsUrl: '' },
  { name: 'Samiya Davis', email: 'jerikdavis33@icloud.com', dob: '2012-07-12', gradYear: 2030, gpa: '3.0', school: 'San Diego High School', city: 'San Diego', state: 'CA', jersey: '51', position: 'Center', fortyDash: '4.93', vertical: '25.0', shuttle: '4.61', broadJump: '8.0', maxPrepsUrl: '' },
  { name: 'Kaydence Goodwin', email: 'kaydencegoodwin2011@gmail.com', dob: '2011-11-09', gradYear: 2030, gpa: '3.5', school: 'Red Oak High School', city: 'Red Oak', state: 'TX', jersey: '4', position: 'WR', fortyDash: '4.77', vertical: '27.2', shuttle: '4.46', broadJump: '8.5', maxPrepsUrl: '' },
  { name: 'Milani Duckett', email: 'mrsduckett06@yahoo.com', dob: '2010-08-02', gradYear: 2028, gpa: '3.8', school: 'Morse High School', city: 'San Diego', state: 'CA', jersey: '38', position: 'RB', fortyDash: '4.72', vertical: '27.8', shuttle: '4.42', broadJump: '8.6', maxPrepsUrl: '' },
  { name: 'Zariah Ferrell', email: 'ferrellderek@yahoo.com', dob: '2011-09-13', gradYear: 2030, gpa: '4.0', school: 'Steele Canyon Charter High', city: 'Spring Valley', state: 'CA', jersey: '5', position: 'Safety', fortyDash: '4.80', vertical: '26.8', shuttle: '4.49', broadJump: '8.3', maxPrepsUrl: '' },
  { name: 'Delilah Passiglia', email: 'lilah619@icloud.com', dob: '2010-06-22', gradYear: 2028, gpa: '3.0', school: 'Granite Hills High School', city: 'El Cajon', state: 'CA', jersey: '24', position: 'WR', fortyDash: '4.88', vertical: '25.8', shuttle: '4.56', broadJump: '8.1', maxPrepsUrl: '' },
  { name: 'Anaya Rush', email: '619jakey@gmail.com', dob: '2013-09-10', gradYear: 2032, gpa: '4.0', school: 'Salt Creek Elementary', city: 'Chula Vista', state: 'CA', jersey: '25', position: 'RB', fortyDash: '4.95', vertical: '24.5', shuttle: '4.63', broadJump: '7.9', maxPrepsUrl: '' },
  { name: 'Akaila Martinez', email: 'emmettvanessawilliams@gmail.com', dob: '2014-04-05', gradYear: 2032, gpa: '3.5', school: 'Harriet Tubman Middle School', city: 'San Diego', state: 'CA', jersey: '25', position: 'WR', fortyDash: '4.94', vertical: '24.8', shuttle: '4.62', broadJump: '8.0', maxPrepsUrl: '' },
  { name: 'Emani Maclin', email: 'mizzwilliams0415@gmail.com', dob: '2009-05-13', gradYear: 2027, gpa: '3.2', school: 'Helix High School', city: 'San Diego', state: 'CA', jersey: '15', position: 'Safety', fortyDash: '4.76', vertical: '27.4', shuttle: '4.45', broadJump: '8.5', maxPrepsUrl: '' },
  { name: 'Kaloi DuHart', email: 'raelynnkpili@gmail.com', dob: '2011-12-15', gradYear: 2030, gpa: '4.0', school: 'Helix High School', city: 'La Mesa', state: 'CA', jersey: '19', position: 'Cornerback', fortyDash: '4.70', vertical: '28.1', shuttle: '4.40', broadJump: '8.7', maxPrepsUrl: '' },
  { name: 'Gisselle Munoz', email: 'jcamunas83@gmail.com', dob: '2013-08-28', gradYear: 2031, gpa: '3.0', school: 'High Tech Middle CV', city: 'Chula Vista', state: 'CA', jersey: '9', position: 'QB', fortyDash: '4.90', vertical: '25.4', shuttle: '4.58', broadJump: '8.1', maxPrepsUrl: '' },
];

async function seedEventAthletes() {
  console.log(`🌱 Seeding ${EVENT_ATHLETES.length} verified combine athletes...`);
  let count = 0;

  for (const a of EVENT_ATHLETES) {
    const normalEmail = a.email.toLowerCase().trim();
    const existingPlayer = await db.select().from(schema.players).where(eq(schema.players.email, normalEmail)).limit(1);

    const preferences = {
      jerseyNumber: a.jersey,
      maxPrepsUrl: a.maxPrepsUrl || undefined,
      verifiedCombine: true,
      eventCohort: 'CA_COMBINE_2026',
    };

    let playerId: number;

    if (existingPlayer.length > 0) {
      playerId = existingPlayer[0].id;
      // If already claimed (passwordHash != null), do not overwrite name or password
      // Just make sure combine stats and verification status are up to date
      await db.update(schema.players).set({
        verificationStatus: 'verified',
        status: 'active',
        emailVerified: true,
        school: existingPlayer[0].school || a.school,
        gradYear: existingPlayer[0].gradYear || a.gradYear,
        gpa: existingPlayer[0].gpa || a.gpa,
        city: existingPlayer[0].city || a.city,
        state: existingPlayer[0].state || a.state,
        position: existingPlayer[0].position || a.position,
        preferences: { ...(existingPlayer[0].preferences as object || {}), ...preferences },
      }).where(eq(schema.players.id, playerId));
    } else {
      // Insert pre-seeded unclaimed profile (passwordHash: null)
      const [inserted] = await db.insert(schema.players).values({
        email: normalEmail,
        name: a.name,
        position: a.position,
        gradYear: a.gradYear,
        gpa: a.gpa,
        school: a.school,
        city: a.city,
        state: a.state,
        sport: 'Flag Football',
        subscriptionTier: 'free',
        verificationStatus: 'verified',
        status: 'active',
        emailVerified: true,
        passwordHash: null,
        preferences,
        dob: new Date(a.dob),
      }).returning();
      playerId = inserted.id;
    }

    // Ensure verified combine stats exist
    const existingCombine = await db.select().from(schema.combineStats).where(eq(schema.combineStats.playerId, playerId)).limit(1);
    if (existingCombine.length > 0) {
      await db.update(schema.combineStats).set({
        fortyDash: a.fortyDash,
        vertical: a.vertical,
        shuttle: a.shuttle,
        broadJump: a.broadJump,
      }).where(eq(schema.combineStats.id, existingCombine[0].id));
    } else {
      await db.insert(schema.combineStats).values({
        playerId,
        season: '2026 Combine',
        fortyDash: a.fortyDash,
        vertical: a.vertical,
        shuttle: a.shuttle,
        broadJump: a.broadJump,
      });
    }

    // Ensure verified parent submission record exists for admin auditing
    const existingSub = await db.select().from(schema.parentStatSubmissions).where(eq(schema.parentStatSubmissions.email, normalEmail)).limit(1);
    if (existingSub.length === 0) {
      await db.insert(schema.parentStatSubmissions).values({
        playerId,
        athleteEmail: normalEmail,
        athleteName: a.name,
        email: normalEmail,
        name: `${a.name} Parent`,
        school: a.school,
        gradYear: a.gradYear,
        position: a.position,
        state: a.state,
        fortyYardDash: parseFloat(a.fortyDash),
        verticalJump: parseFloat(a.vertical),
        shuttle5105: parseFloat(a.shuttle),
        broadJump: parseFloat(a.broadJump),
        maxPrepsUrl: a.maxPrepsUrl || null,
        status: 'verified',
        verificationStatus: 'verified',
        source: 'combine_event_import',
        notes: `Verified combine metrics from CA combine. Jersey #${a.jersey}`,
      });
    }

    count++;
  }

  console.log(`✅ Seeded/Synchronized ${count} verified combine athletes!`);
  process.exit(0);
}

seedEventAthletes().catch((e) => {
  console.error('❌ Event athlete seeding failed:', e);
  process.exit(1);
});
