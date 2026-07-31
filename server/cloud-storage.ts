// Cloud storage service for media (profile photos + game film video).
// Supports: AWS S3, Cloudflare R2, or any S3-compatible storage.
//
// [D-08] Game film (100–500MB) is kept in a SEPARATE bucket from profile photos
// with its own CDN distribution, longer presign TTL, immutable cache headers,
// and a hard size cap. See docs/VIDEO-STORAGE.md for buckets, CDN, costs, and
// lifecycle rules.
//
// Objects are PRIVATE. Nothing here emits a permanent public URL; reads go
// through short-TTL signed GET URLs (getSignedDownloadUrl). All writes set
// ServerSideEncryption AES256.

import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Profile photos / general media.
const photoBucket = process.env.S3_BUCKET || 'hers365-media';

// [D-08] Game film lives in its own bucket. Falls back to the photo bucket if
// unset so local dev still works without extra config.
const videoBucket = process.env.VIDEO_BUCKET || photoBucket;

// [D-08] Cap game-film uploads (default 500MB) and give signed PUT URLs a long
// TTL so a large upload can't expire mid-transfer (1h is far too short for
// 100–500MB over a home connection).
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_BYTES) || 500 * 1024 * 1024;
const VIDEO_UPLOAD_TTL = Number(process.env.VIDEO_UPLOAD_TTL_SECONDS) || 6 * 60 * 60; // 6h

export const DOWNLOAD_URL_TTL = 15 * 60;

export interface UploadResult {
  url: string;
  key: string;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 100) || 'file';
}

export async function uploadVideo(file: Buffer, filename: string, contentType: string): Promise<UploadResult> {
  // [D-08] Enforce the size cap server-side regardless of any client check.
  if (file.length > MAX_VIDEO_BYTES) {
    throw new Error(`Video exceeds the ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB limit`);
  }

  const key = `videos/${randomUUID()}-${sanitizeFilename(filename)}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: videoBucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  }));

  return { url: await getSignedDownloadUrl(key), key };
}

export async function uploadImage(file: Buffer, filename: string, contentType: string): Promise<UploadResult> {
  const key = `images/${randomUUID()}-${sanitizeFilename(filename)}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: photoBucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  }));

  return { url: await getSignedDownloadUrl(key), key };
}

// [D-08] Browser-direct upload for game film: returns a presigned PUT URL on the
// VIDEO bucket with a long TTL. Lets large files go straight to S3 without
// streaming through the API server. Store the returned `key` and sign reads
// via getSignedDownloadUrl().
export async function getSignedVideoUploadUrl(
  filename: string,
  contentType: string,
  expiresIn = VIDEO_UPLOAD_TTL,
  contentLength?: number,
): Promise<{ uploadUrl: string; key: string; downloadUrl: string; maxBytes: number }> {
  const key = `videos/${randomUUID()}-${sanitizeFilename(filename)}`;
  const command = new PutObjectCommand({
    Bucket: videoBucket,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
    ...(contentLength ? { ContentLength: contentLength } : {}),
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return { uploadUrl, key, downloadUrl: await getSignedDownloadUrl(key), maxBytes: MAX_VIDEO_BYTES };
}

export function videoPublicUrl(key: string): Promise<string> {
  return getSignedDownloadUrl(key);
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  contentLength?: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: key.startsWith('videos/') ? videoBucket : photoBucket,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
    ...(contentLength ? { ContentLength: contentLength } : {}),
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedDownloadUrl(key: string, expiresIn = DOWNLOAD_URL_TTL): Promise<string> {
  // Default to the photo bucket; pass a videos/ key for film and it resolves
  // against the video bucket instead.
  const isVideo = key.startsWith('videos/');
  const command = new GetObjectCommand({
    Bucket: isVideo ? videoBucket : photoBucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}
