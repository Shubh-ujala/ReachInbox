import { Request, Response } from 'express';
import { syncClerkUser } from '../services/authService';
import { config } from '../config';

/** Syncs a Clerk authenticated profile into MongoDB Atlas */
export async function syncUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const { clerkId, email, name, avatar } = req.body;

    if (!clerkId || !email) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: clerkId and email are required',
      });
      return;
    }

    const user = await syncClerkUser({ clerkId, email, name, avatar });

    res.status(200).json({
      success: true,
      data: { user },
      message: 'User synchronized successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'User synchronization failed';
    res.status(500).json({
      success: false,
      error: msg,
    });
  }
}

/** Returns the authenticated user from the active Clerk session */
export async function getMeHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
}

/** Provides public auth configuration to frontend */
export async function getAuthConfigHandler(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: {
      clerkPublishableKey: config.clerk.publishableKey || null,
      isClerkConfigured: Boolean(config.clerk.publishableKey),
    },
  });
}
