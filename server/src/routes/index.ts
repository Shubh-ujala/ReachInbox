import { Router } from 'express';
import {
  scheduleEmailHandler,
  getScheduledHandler,
  getSentHandler,
  getFailedHandler,
  getJobHandler,
  cancelJobHandler,
  getDashboardStatsHandler,
  healthHandler,
} from '../controllers/emailController';
import { authRouter } from './authRoutes';
import { optionalAuth } from '../middleware/authMiddleware';

const emailRouter = Router();
const dashboardRouter = Router();
const healthRouter = Router();

// Apply optionalAuth so user sessions are identified when present
emailRouter.use(optionalAuth);
dashboardRouter.use(optionalAuth);

// Email routes
emailRouter.post('/schedule', scheduleEmailHandler);
emailRouter.get('/scheduled', getScheduledHandler);
emailRouter.get('/sent', getSentHandler);
emailRouter.get('/failed', getFailedHandler);
emailRouter.get('/:id', getJobHandler);
emailRouter.delete('/:id', cancelJobHandler);

// Dashboard
dashboardRouter.get('/stats', getDashboardStatsHandler);

// Health
healthRouter.get('/', healthHandler);

export { emailRouter, dashboardRouter, healthRouter, authRouter };

