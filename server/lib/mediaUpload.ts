// Minor media upload is CLOSED unless explicitly opted in (fails closed until
// content scanning ships). Unset / '' / 'false' / anything != 'true' => closed.
// Read process.env at call time (per request) so tests can flip it.
export function isMediaUploadEnabled(): boolean {
  return process.env.MEDIA_UPLOAD_ENABLED === 'true';
}
