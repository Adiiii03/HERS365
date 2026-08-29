// video-worker.ts

// Load environment variables before importing modules that read process.env.
import './load-env';

import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    downloadVideoToLocal,
    uploadProcessedFile,
} from './cloud-storage';
import { pool } from './db';
import {
    claimNextVideoJob,
    completeVideoJob,
    failOrRetryVideoJob,
    recoverStaleVideoJobs,
    type VideoJob,
} from './videoJobService';
import {
    assertFfmpegAvailable,
    processVideo,
} from './videoProcessor';

const POLL_INTERVAL_MS =
    Number(process.env.VIDEO_WORKER_POLL_MS) || 5_000;

const MOCK_PROCESSING_ENABLED =
    process.env.VIDEO_PROCESSING_MOCK === 'true';

function validateWorkerConfiguration(): void {
    if (
        process.env.NODE_ENV === 'production' &&
        MOCK_PROCESSING_ENABLED
    ) {
        throw new Error(
            'VIDEO_PROCESSING_MOCK cannot be enabled in production',
        );
    }
}

let shuttingDown = false;

function handleShutdown(signal: string): void {
    console.log(`[video-worker] Received ${signal}; stopping`);
    shuttingDown = true;
}

process.once('SIGINT', () => handleShutdown('SIGINT'));
process.once('SIGTERM', () => handleShutdown('SIGTERM'));

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

async function processVideoMock(
    outputPath: string,
    thumbnailPath: string,
): Promise<void> {
    await sleep(1_500);

    await Promise.all([
        writeFile(
            outputPath,
            'Mock processed video output',
        ),
        writeFile(
            thumbnailPath,
            'Mock thumbnail output',
        ),
    ]);
}

function createOutputKeys(job: VideoJob): {
    outputKey: string;
    thumbnailKey: string;
} {
    const outputId = randomUUID();

    return {
        outputKey: `videos/processed/${job.id}/${outputId}.mp4`,
        thumbnailKey: `videos/thumbnails/${job.id}/${outputId}.jpg`,
    };
}

async function updateHighlight(
    job: VideoJob,
    outputKey: string,
    thumbnailKey: string,
): Promise<void> {
    if (job.targetType !== 'highlight') {
        throw new Error(
            `Unsupported video job target type: ${job.targetType}`,
        );
    }

    const result = await pool.query(
        `
      UPDATE player_highlights
      SET
        video_url = $1,
        thumbnail_url = $2
      WHERE id = $3
        AND player_id = $4
    `,
        [
            outputKey,
            thumbnailKey,
            job.targetId,
            job.playerId,
        ],
    );

    if (result.rowCount !== 1) {
        throw new Error(
            `Highlight ${job.targetId} was not found for player ${job.playerId}`,
        );
    }
}

export async function processClaimedVideoJob(
    job: VideoJob,
): Promise<{ outputKey: string; thumbnailKey: string }> {
    const temporaryDirectory = await mkdtemp(
        join(tmpdir(), 'hers365-video-'),
    );

    const inputPath = join(temporaryDirectory, 'source-video');
    const outputPath = join(temporaryDirectory, 'processed.mp4');
    const thumbnailPath = join(
        temporaryDirectory,
        'thumbnail.jpg',
    );

    const { outputKey, thumbnailKey } = createOutputKeys(job);

    try {
        console.log(`[video-worker] Downloading job ${job.id}`);

        await downloadVideoToLocal(job.sourceKey, inputPath);

        console.log(`[video-worker] Processing job ${job.id}`);

        if (MOCK_PROCESSING_ENABLED) {
            console.log(
                `[video-worker] Mock-processing job ${job.id}`,
            );

            await processVideoMock(
                outputPath,
                thumbnailPath,
            );
        } else {
            await processVideo({
                inputPath,
                outputPath,
                thumbnailPath,
                trimStartSeconds: job.clipSettings?.start,
                trimEndSeconds: job.clipSettings?.end,
            });
        }

        console.log(
            `[video-worker] Uploading outputs for job ${job.id}`,
        );

        await uploadProcessedFile(
            outputPath,
            outputKey,
            'video/mp4',
        );

        await uploadProcessedFile(
            thumbnailPath,
            thumbnailKey,
            'image/jpeg',
        );

        await updateHighlight(job, outputKey, thumbnailKey);

        return { outputKey, thumbnailKey };
    } finally {
        await rm(temporaryDirectory, {
            recursive: true,
            force: true,
        }).catch((cleanupError: unknown) => {
            console.error(
                `[video-worker] Could not clean temporary files for job ${job.id}`,
                cleanupError,
            );
        });
    }
}

async function processNextJob(): Promise<boolean> {
    const job = await claimNextVideoJob();

    if (!job) {
        return false;
    }

    try {
        const { outputKey, thumbnailKey } =
            await processClaimedVideoJob(job);

        await completeVideoJob(
            job.id,
            outputKey,
            thumbnailKey,
        );

        console.log(`[video-worker] Completed job ${job.id}`);

        return true;
    } catch (error) {
        try {
            const updatedJob = await failOrRetryVideoJob(
                job.id,
                error,
            );

            console.error(
                `[video-worker] Job ${job.id} failed; status is now ${updatedJob.status}`,
                error,
            );
        } catch (jobUpdateError) {
            console.error(
                `[video-worker] Could not record failure for job ${job.id}`,
                jobUpdateError,
            );
        }

        return true;
    }
}

async function runWorker(): Promise<void> {
    console.log('[video-worker] Starting');

    validateWorkerConfiguration();

    if (MOCK_PROCESSING_ENABLED) {
        console.log(
            '[video-worker] Mock processing enabled',
        );
    } else {
        await assertFfmpegAvailable();
        console.log('[video-worker] FFmpeg is available');
    }

    const recoveredJobs = await recoverStaleVideoJobs();

    if (recoveredJobs > 0) {
        console.log(
            `[video-worker] Recovered ${recoveredJobs} stale job(s)`,
        );
    }

    while (!shuttingDown) {
        try {
            const processedJob = await processNextJob();

            if (!processedJob && !shuttingDown) {
                await sleep(POLL_INTERVAL_MS);
            }
        } catch (error) {
            console.error(
                '[video-worker] Worker-loop error',
                error,
            );

            if (!shuttingDown) {
                await sleep(POLL_INTERVAL_MS);
            }
        }
    }

    console.log('[video-worker] Stopped');
}

runWorker()
    .catch((error: unknown) => {
        console.error(
            '[video-worker] Fatal startup error',
            error,
        );

        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });