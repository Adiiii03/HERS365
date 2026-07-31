// Side-effecting module: loads the repo-root .env at import time. Because ES
// imports are hoisted and evaluated before module-body code, importing this
// FIRST guarantees env is populated before any module that reads process.env at
// its top level (e.g. auth.ts capturing JWT_SECRET). The real .env lives one
// level above server/; resolve it relative to this file so the CWD doesn't
// matter. dotenv never overrides already-set vars, so re-running is safe and
// Railway's injected env still wins.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dir, '../.env') });
