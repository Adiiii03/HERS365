import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';

export async function requireActivated(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user as { role?: string; userId?: number; id?: number } | undefined;
  if (!user || user.role !== 'athlete') {
    next();
    return;
  }

  const playerId = Number(user.userId ?? user.id);
  const [row] = await db
    .select({ status: schema.players.status })
    .from(schema.players)
    .where(eq(schema.players.id, playerId))
    .limit(1);

  const status = row?.status;
  if (status === 'active') {
    next();
    return;
  }

  res.status(403).json({ code: status === 'deactivated' ? 'ACCOUNT_DEACTIVATED' : 'GUARDIAN_PENDING' });
}

export default requireActivated;
