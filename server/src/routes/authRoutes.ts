import { Router } from 'express';
import {
  syncUserHandler,
  getMeHandler,
  getAuthConfigHandler,
} from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';

export const authRouter = Router();

authRouter.post('/sync', syncUserHandler);
authRouter.get('/config', getAuthConfigHandler);
authRouter.get('/me', requireAuth, getMeHandler);
