import '../../load-env';
import { pool } from '../../db';


const TABLES = [
  'refresh_tokens',
  'messages',
  'message_requests',
  'message_blocks',
  'message_reports',
  'parent_child_relations',
  'parent_stat_submissions',
  'guardian_verification_codes',
  'guardian_consents',
  'consent_audit_log',
  'admin_access_log',
  'event_registrations',
  'saved_scholarships',
  'support_interactions',
  'events',
  'scholarships',
  'faqs',
  'combine_stats',
  'athlete_rankings',
  'payments',
  'parents',
  'coaches',
  'video_jobs',
  'player_highlights',
  'players',
  // event_inbox is the dedupe ledger for Stripe webhook idempotency; clear so
  // tests that replay the same event.id start from a known state.
  'event_inbox',
  'admin_users',
  'skill_challenge_completions',
  'drills',
  'training_plans',
  'teams',
  'program_applications',
  'program_details',
];

export async function resetDb() {
  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
