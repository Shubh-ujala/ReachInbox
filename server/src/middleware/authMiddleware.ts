import { Request, Response, NextFunction } from 'express';
import { verifyClerkSessionToken, AuthUserPayload } from '../services/authService';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in with Google via Clerk.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = await verifyClerkSessionToken(token);
    req.user = user;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid or expired session token';
    logger.warn('Authentication rejected', { error: message });
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please sign in again.',
    });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = await verifyClerkSessionToken(token);
    } catch {
      // ignore invalid token for optional auth
    }
  }

  next();
}
