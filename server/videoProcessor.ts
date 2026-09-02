import { spawn } from 'node:child_process';

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

export interface VideoProcessingOptions {
    inputPath: string;
    outputPath: string;
    thumbnailPath: string;
    trimStartSeconds?: number;
    trimEndSeconds?: number;
}

function validateTrimRange(
    trimStartSeconds?: number,
    trimEndSeconds?: number,
): void {
    if (
        trimStartSeconds !== undefined &&
        (!Number.isFinite(trimStartSeconds) || trimStartSeconds < 0)
    ) {
        throw new Error('trimStartSeconds must be a non-negative number');
    }

    if (
        trimEndSeconds !== undefined &&
        (!Number.isFinite(trimEndSeconds) || trimEndSeconds <= 0)
    ) {
        throw new Error('trimEndSeconds must be greater than zero');
    }

    if (
        trimStartSeconds !== undefined &&
        trimEndSeconds !== undefined &&
        trimEndSeconds <= trimStartSeconds
    ) {
        throw new Error('trimEndSeconds must be greater than trimStartSeconds');
    }
}

/**
 * Runs FFmpeg without invoking a shell.
 *
 * Using spawn() with an argument array prevents filenames or user input from
 * being interpreted as shell commands.
 */
function runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(FFMPEG_PATH, args, {
            shell: false,
            windowsHide: true,
        });

        let stderr = '';

        child.stderr.on('data', (chunk: Buffer | string) => {
            // Keep the end of FFmpeg's error output without allowing unlimited memory.
            stderr += chunk.toString();

            if (stderr.length > 20_000) {
                stderr = stderr.slice(-20_000);
            }
        });

        child.once('error', (error) => {
            reject(
                new Error(
                    `Unable to start FFmpeg at "${FFMPEG_PATH}": ${error.message}`,
                ),
            );
        });

        child.once('close', (exitCode) => {
            if (exitCode === 0) {
                resolve();
                return;
            }

            const details = stderr.trim() || 'No FFmpeg error output was provided';

            reject(
                new Error(`FFmpeg exited with code ${exitCode}: ${details}`),
            );
        });
    });
}

/**
 * Confirms that FFmpeg is installed and executable.
 */
export async function assertFfmpegAvailable(): Promise<void> {
    await runFfmpeg(['-version']);
}

/**
 * Converts the source video into a browser-compatible MP4.
 */
export async function transcodeVideo(
    inputPath: string,
    outputPath: string,
    trimStartSeconds?: number,
    trimEndSeconds?: number,
): Promise<void> {
    validateTrimRange(trimStartSeconds, trimEndSeconds);

    const args: string[] = [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
    ];

    // Putting -ss before -i allows FFmpeg to seek more efficiently.
    if (trimStartSeconds !== undefined) {
        args.push('-ss', trimStartSeconds.toString());
    }

    args.push('-i', inputPath);

    if (trimEndSeconds !== undefined) {
        const duration =
            trimStartSeconds !== undefined
                ? trimEndSeconds - trimStartSeconds
                : trimEndSeconds;

        args.push('-t', duration.toString());
    }

    args.push(
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        outputPath,
    );

    await runFfmpeg(args);
}

/**
 * Extracts one JPEG thumbnail from the processed video.
 */
export async function generateThumbnail(
    inputPath: string,
    thumbnailPath: string,
    timestampSeconds = 1,
): Promise<void> {
    if (!Number.isFinite(timestampSeconds) || timestampSeconds < 0) {
        throw new Error('Thumbnail timestamp must be a non-negative number');
    }

    await runFfmpeg([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        timestampSeconds.toString(),
        '-i',
        inputPath,
        '-frames:v',
        '1',
        '-vf',
        'scale=640:-2',
        '-q:v',
        '2',
        thumbnailPath,
    ]);
}

/**
 * Performs the complete initial processing operation.
 */
export async function processVideo(
    options: VideoProcessingOptions,
): Promise<void> {
    const {
        inputPath,
        outputPath,
        thumbnailPath,
        trimStartSeconds,
        trimEndSeconds,
    } = options;

    validateTrimRange(trimStartSeconds, trimEndSeconds);

    await transcodeVideo(
        inputPath,
        outputPath,
        trimStartSeconds,
        trimEndSeconds,
    );

    // Generate the thumbnail from the processed output so it matches the clip.
    await generateThumbnail(outputPath, thumbnailPath);
}