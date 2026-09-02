import { pool } from './db';

export interface VideoClipSettings {
    start?: number;
    end?: number;
}

export interface VideoJob {
    id: number;
    playerId: number;
    sourceKey: string;
    outputKey: string | null;
    thumbnailKey: string | null;
    targetType: string;
    targetId: number;
    clipSettings: VideoClipSettings | null;
    status: string;
    attempts: number;
    maxAttempts: number;
    error: string | null;
    lockedAt: Date | null;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

interface VideoJobRow {
    id: number;
    player_id: number;
    source_key: string;
    output_key: string | null;
    thumbnail_key: string | null;
    target_type: string;
    target_id: number;
    clip_settings: VideoClipSettings | null;
    status: string;
    attempts: number;
    max_attempts: number;
    error: string | null;
    locked_at: Date | null;
    processed_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

function mapVideoJob(row: VideoJobRow): VideoJob {
    return {
        id: row.id,
        playerId: row.player_id,
        sourceKey: row.source_key,
        outputKey: row.output_key,
        thumbnailKey: row.thumbnail_key,
        targetType: row.target_type,
        targetId: row.target_id,
        clipSettings: row.clip_settings,
        status: row.status,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        error: row.error,
        lockedAt: row.locked_at,
        processedAt: row.processed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Atomically claims the oldest available pending job.
 *
 * SKIP LOCKED prevents two workers from claiming the same row.
 * The database releases the row lock as soon as this statement completes.
 */
export async function claimNextVideoJob(): Promise<VideoJob | null> {
    const result = await pool.query<VideoJobRow>(`
    WITH next_job AS (
      SELECT id
      FROM video_jobs
      WHERE status = 'pending'
        AND attempts < max_attempts
      ORDER BY created_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE video_jobs AS job
    SET
      status = 'processing',
      attempts = job.attempts + 1,
      locked_at = NOW(),
      updated_at = NOW(),
      error = NULL
    FROM next_job
    WHERE job.id = next_job.id
    RETURNING job.*
  `);

    const row = result.rows[0];

    return row ? mapVideoJob(row) : null;
}

/**
 * Marks a successfully processed job as completed.
 */
export async function completeVideoJob(
    jobId: number,
    outputKey: string,
    thumbnailKey: string,
): Promise<VideoJob> {
    const result = await pool.query<VideoJobRow>(
        `
      UPDATE video_jobs
      SET
        status = 'completed',
        output_key = $2,
        thumbnail_key = $3,
        error = NULL,
        locked_at = NULL,
        processed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND status = 'processing'
      RETURNING *
    `,
        [jobId, outputKey, thumbnailKey],
    );

    const row = result.rows[0];

    if (!row) {
        throw new Error(
            `Cannot complete video job ${jobId}: processing job not found`,
        );
    }

    return mapVideoJob(row);
}

/**
 * Returns a failed attempt to pending status when retries remain.
 * Permanently fails the job after the final allowed attempt.
 */
export async function failOrRetryVideoJob(
    jobId: number,
    error: unknown,
): Promise<VideoJob> {
    const errorMessage = getSafeErrorMessage(error);

    const result = await pool.query<VideoJobRow>(
        `
      UPDATE video_jobs
      SET
        status = CASE
          WHEN attempts < max_attempts THEN 'pending'
          ELSE 'failed'
        END,
        error = $2,
        locked_at = NULL,
        processed_at = CASE
          WHEN attempts >= max_attempts THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE id = $1
        AND status = 'processing'
      RETURNING *
    `,
        [jobId, errorMessage],
    );

    const row = result.rows[0];

    if (!row) {
        throw new Error(
            `Cannot fail video job ${jobId}: processing job not found`,
        );
    }

    return mapVideoJob(row);
}

/**
 * Recovers jobs left in processing state after a worker crashed.
 */
export async function recoverStaleVideoJobs(
    staleAfterMinutes = 30,
): Promise<number> {
    if (
        !Number.isFinite(staleAfterMinutes) ||
        staleAfterMinutes <= 0
    ) {
        throw new Error('staleAfterMinutes must be greater than zero');
    }

    const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000);

    const result = await pool.query<{ id: number }>(
        `
      UPDATE video_jobs
      SET
        status = CASE
          WHEN attempts < max_attempts THEN 'pending'
          ELSE 'failed'
        END,
        error = CASE
          WHEN attempts < max_attempts
            THEN 'Previous processing attempt was interrupted'
          ELSE 'Video processing failed after the worker became unresponsive'
        END,
        locked_at = NULL,
        processed_at = CASE
          WHEN attempts >= max_attempts THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE status = 'processing'
        AND locked_at < $1
      RETURNING id
    `,
        [cutoff],
    );

    return result.rowCount ?? 0;
}

function getSafeErrorMessage(error: unknown): string {
    const message =
        error instanceof Error
            ? error.message
            : 'Unknown video-processing error';

    // Avoid writing unlimited FFmpeg output or sensitive details to the database.
    return message.slice(0, 2_000);
}