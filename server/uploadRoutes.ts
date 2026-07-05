import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getSignedUploadUrl, getSignedDownloadUrl } from './cloud-storage';
import { requireAuth } from './auth';
import { requireActivated, requireVerifiedGuardian } from './middleware/requireActivated';
import { isMediaUploadEnabled } from './lib/mediaUpload';
import { validateBody } from './middleware/validate';
import { uploadImagePresignBody, uploadVideoPresignBody } from './middleware/safetySchemas';

const router = express.Router();
router.use(requireAuth);

// Minor media stays off until content scanning ships (V2). Fails closed.
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!isMediaUploadEnabled()) {
    res.status(403).json({
      code: 'MEDIA_UPLOAD_DISABLED',
      error: 'Photo and video uploads are not available yet.',
    });
    return;
  }
  next();
});
router.use(requireActivated);
router.use(requireVerifiedGuardian);

const VIDEO_EXTENSION_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/**
 * POST /api/upload/presign
 * Body: { filename, contentType, size? }
 * Returns: { uploadUrl, key, publicUrl }
 *
 * Client PUTs the file directly to uploadUrl. `publicUrl` is a short-TTL
 * signed GET URL for immediate display — objects are private.
 */
router.post('/presign', validateBody(uploadImagePresignBody), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, contentType, size } = req.body as { filename: string; contentType: string; size?: number };
    // Strip path separators defensively even though the key is anchored to a
    // server-generated prefix — keeps the extension parse from picking up a
    // surprise from a crafted filename.
    const safeExt = (filename.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
    const key = `profile-photos/${randomUUID()}.${safeExt}`;
    const uploadUrl = await getSignedUploadUrl(key, contentType, 300, size); // 5-min TTL
    res.json({ uploadUrl, key, publicUrl: await getSignedDownloadUrl(key) });
  } catch (err) {
    next(err);
  }
});

router.post('/video/presign', validateBody(uploadVideoPresignBody), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contentType, size } = req.body as { contentType: string; size: number };
    const ext = VIDEO_EXTENSION_BY_TYPE[contentType];
    if (!ext) {
      // Zod's enum on contentType should have caught this; defence in depth.
      return res.status(400).json({ error: 'Unsupported video type' });
    }
    const key = `videos/${randomUUID()}.${ext}`;
    const uploadUrl = await getSignedUploadUrl(key, contentType, 300, size); // 5-min TTL
    res.json({ uploadUrl, key, publicUrl: await getSignedDownloadUrl(key) });
  } catch (err) {
    next(err);
  }
});

export default router;
