import '../../load-env';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { eq } from 'drizzle-orm';

import { db, pool } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

vi.mock('../cloud-storage', async () => {
    const fs = await import('node:fs/promises');

    return {
        downloadVideoToLocal: vi.fn(
            async (_key: string, localPath: string) => {
                await fs.writeFile(
                    localPath,
                    'Mock downloaded source video',
                );
            },
        ),

        uploadProcessedFile: vi.fn(
            async (
                localPath: string,
                key: string,
                _contentType: string,
            ) => {
                const fileStats = await fs.stat(localPath);

                if (fileStats.size === 0) {
                    throw new Error('Test output was empty');
                }

                return `https://signed.test.local/${key}`;
            },
        ),
    };
});

vi.mock('../videoProcessor', async () => {
    const fs = await import('node:fs/promises');

    return {
        assertFfmpegAvailable: vi.fn(async () => undefined),

        processVideo: vi.fn(
            async ({
                outputPath,
                thumbnailPath,
            }: {
                outputPath: string;
                thumbnailPath: string;
            }) => {
                await Promise.all([
                    fs.writeFile(outputPath, 'Processed MP4 output'),
                    fs.writeFile(thumbnailPath, 'JPEG thumbnail output'),
                ]);
            },
        ),
    };
});

import {
    downloadVideoToLocal,
    uploadProcessedFile,
} from '../cloud-storage';
import {
    processNextJob,
    validateWorkerConfiguration,
} from '../video-worker';
import { processVideo } from '../videoProcessor';
import {
    claimNextVideoJob,
    recoverStaleVideoJobs,
} from '../videoJobService';

async function createHighlightAndJob(
    options: {
        maxAttempts?: number;
        status?: string;
        lockedAt?: Date;
    } = {},
) {
    const athlete = await makeAthlete();

    const [highlight] = await db
        .insert(schema.playerHighlights)
        .values({
            playerId: athlete.id,
            videoUrl: null,
            thumbnailUrl: null,
            category: 'Highlight',
            season: '2026',
            annotations: [],
            clipSettings: {
                start: 2,
                end: 8,
            },
        })
        .returning();

    const [job] = await db
        .insert(schema.videoJobs)
        .values({
            playerId: athlete.id,
            sourceKey: `videos/source-${athlete.id}.mp4`,
            targetType: 'highlight',
            targetId: highlight.id,
            clipSettings: {
                start: 2,
                end: 8,
            },
            status: options.status ?? 'pending',
            maxAttempts: options.maxAttempts ?? 3,
            lockedAt: options.lockedAt,
        })
        .returning();

    return {
        athlete,
        highlight,
        job,
    };
}

beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.VIDEO_PROCESSING_MOCK;

    await resetDb();

    vi.clearAllMocks();

    vi.mocked(downloadVideoToLocal).mockImplementation(
        async (_key: string, localPath: string) => {
            await writeFile(
                localPath,
                'Mock downloaded source video',
            );
        },
    );

    vi.mocked(uploadProcessedFile).mockImplementation(
        async (
            localPath: string,
            key: string,
            _contentType: string,
        ) => {
            const fileStats = await stat(localPath);

            if (fileStats.size === 0) {
                throw new Error('Test output was empty');
            }

            return `https://signed.test.local/${key}`;
        },
    );
});

afterEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.VIDEO_PROCESSING_MOCK;
});

describe('video worker configuration', () => {
    it('rejects mock processing in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.VIDEO_PROCESSING_MOCK = 'true';

        expect(() => validateWorkerConfiguration()).toThrow(
            'VIDEO_PROCESSING_MOCK cannot be enabled in production',
        );
    });

    it('allows explicit mock processing during tests', () => {
        process.env.NODE_ENV = 'test';
        process.env.VIDEO_PROCESSING_MOCK = 'true';

        expect(() => validateWorkerConfiguration()).not.toThrow();
    });
});

describe('video job claiming', () => {
    it('claims a pending job and increments its attempts', async () => {
        const { job } = await createHighlightAndJob();

        const claimedJob = await claimNextVideoJob();

        expect(claimedJob).not.toBeNull();
        expect(claimedJob?.id).toBe(job.id);
        expect(claimedJob?.status).toBe('processing');
        expect(claimedJob?.attempts).toBe(1);
        expect(claimedJob?.lockedAt).toBeInstanceOf(Date);
    });

    it('does not allow two workers to claim the same job', async () => {
        const { job } = await createHighlightAndJob();

        const results = await Promise.all([
            claimNextVideoJob(),
            claimNextVideoJob(),
        ]);

        const claimedJobs = results.filter(
            (result) => result !== null,
        );

        expect(claimedJobs).toHaveLength(1);
        expect(claimedJobs[0]?.id).toBe(job.id);
    });
});

describe('video job processing', () => {
    it(
        'processes a job in mock mode and updates its highlight',
        async () => {
            process.env.VIDEO_PROCESSING_MOCK = 'true';

            const { highlight, job } =
                await createHighlightAndJob();

            const processed = await processNextJob();

            expect(processed).toBe(true);
            expect(processVideo).not.toHaveBeenCalled();

            const [updatedJob] = await db
                .select()
                .from(schema.videoJobs)
                .where(eq(schema.videoJobs.id, job.id))
                .limit(1);

            expect(updatedJob.status).toBe('completed');
            expect(updatedJob.attempts).toBe(1);
            expect(updatedJob.outputKey).toMatch(
                /^videos\/processed\/\d+\/[0-9a-f-]+\.mp4$/,
            );
            expect(updatedJob.thumbnailKey).toMatch(
                /^videos\/thumbnails\/\d+\/[0-9a-f-]+\.jpg$/,
            );

            const [updatedHighlight] = await db
                .select()
                .from(schema.playerHighlights)
                .where(
                    eq(
                        schema.playerHighlights.id,
                        highlight.id,
                    ),
                )
                .limit(1);

            expect(updatedHighlight.videoUrl).toBe(
                updatedJob.outputKey,
            );
            expect(updatedHighlight.thumbnailUrl).toBe(
                updatedJob.thumbnailKey,
            );

            expect(uploadProcessedFile).toHaveBeenCalledTimes(2);
        },
        10_000,
    );

    it('removes the temporary directory after processing', async () => {
        process.env.VIDEO_PROCESSING_MOCK = 'true';

        await createHighlightAndJob();
        await processNextJob();

        const uploadedPaths = vi
            .mocked(uploadProcessedFile)
            .mock.calls
            .map(([localPath]) => localPath);

        expect(uploadedPaths).toHaveLength(2);

        const temporaryDirectory = dirname(uploadedPaths[0]);

        await expect(stat(temporaryDirectory)).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('retries failures and fails after maxAttempts', async () => {
        await createHighlightAndJob({
            maxAttempts: 2,
        });

        vi.mocked(downloadVideoToLocal).mockRejectedValue(
            new Error('S3 download failed'),
        );

        await processNextJob();

        const [afterFirstFailure] = await db
            .select()
            .from(schema.videoJobs)
            .limit(1);

        expect(afterFirstFailure.status).toBe('pending');
        expect(afterFirstFailure.attempts).toBe(1);
        expect(afterFirstFailure.error).toContain(
            'S3 download failed',
        );

        await processNextJob();

        const [afterSecondFailure] = await db
            .select()
            .from(schema.videoJobs)
            .limit(1);

        expect(afterSecondFailure.status).toBe('failed');
        expect(afterSecondFailure.attempts).toBe(2);
        expect(afterSecondFailure.error).toContain(
            'S3 download failed',
        );
    });

    it('returns false when no jobs are pending', async () => {
        const processed = await processNextJob();

        expect(processed).toBe(false);
    });
});

describe('stale job recovery', () => {
    it('returns an interrupted job to pending status', async () => {
        const { job } = await createHighlightAndJob({
            status: 'processing',
        });

        // Use PostgreSQL's clock so the test does not depend on JS/DB timezone
        // conversion behavior.
        await pool.query(
            `
      UPDATE video_jobs
      SET locked_at = NOW() - INTERVAL '60 minutes'
      WHERE id = $1
    `,
            [job.id],
        );

        const recoveredCount = await recoverStaleVideoJobs(30);

        expect(recoveredCount).toBe(1);

        const [recoveredJob] = await db
            .select()
            .from(schema.videoJobs)
            .where(eq(schema.videoJobs.id, job.id))
            .limit(1);

        expect(recoveredJob.status).toBe('pending');
        expect(recoveredJob.lockedAt).toBeNull();
        expect(recoveredJob.error).toContain(
            'interrupted',
        );
    });
});