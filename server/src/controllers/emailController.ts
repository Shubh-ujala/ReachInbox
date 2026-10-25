import { Request, Response, NextFunction } from 'express';
import { scheduleEmailSchema } from '../validators/emailValidator';
import {
  scheduleEmail,
  getDelayedJobs,
  getWaitingJobs,
  getActiveJobs,
  getCompletedJobs,
  getFailedJobs,
  getJobById,
  cancelJob,
  getDashboardStats,
} from '../services/emailService';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../types';

function ok<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  res.status(status).json(body);
}

function fail(res: Response, message: string, status = 400): void {
  const body: ApiResponse<never> = { success: false, error: message };
  res.status(status).json(body);
}

// ── POST /api/emails/schedule ─────────────────────────────────────────────────
export async function scheduleEmailHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = scheduleEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      fail(res, errors.join('; '), 422);
      return;
    }

    // Idempotency key from header (optional — clients can send X-Idempotency-Key)
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || undefined;

    const result = await scheduleEmail(parsed.data, idempotencyKey, req.user?.id);
    ok(res, result, 201);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 409) {
      fail(res, e.message, 409);
      return;
    }
    next(err);
  }
}

// ── GET /api/emails/scheduled ─────────────────────────────────────────────────
export async function getScheduledHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [delayed, waiting] = await Promise.all([getDelayedJobs(), getWaitingJobs()]);
    const jobs = [...delayed, ...waiting].sort((a, b) => a.timestamp - b.timestamp);
    ok(res, { jobs, count: jobs.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/emails/sent ──────────────────────────────────────────────────────
export async function getSentHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobs = await getCompletedJobs();
    ok(res, { jobs, count: jobs.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/emails/failed ────────────────────────────────────────────────────
export async function getFailedHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [failed, active] = await Promise.all([getFailedJobs(), getActiveJobs()]);
    ok(res, { jobs: [...failed, ...active], count: failed.length + active.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/emails/:id ───────────────────────────────────────────────────────
export async function getJobHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await getJobById(req.params.id);
    if (!job) {
      fail(res, 'Job not found — it may have been removed or expired', 404);
      return;
    }
    ok(res, job);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/emails/:id ────────────────────────────────────────────────────
export async function cancelJobHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await cancelJob(req.params.id);
    if (!result.cancelled) {
      fail(res, result.reason, 409);
      return;
    }
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/dashboard/stats ──────────────────────────────────────────────────
export async function getDashboardStatsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getDashboardStats();
    ok(res, stats);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/health ───────────────────────────────────────────────────────────
export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const { getHealthRedis } = await import('../config/redis');
  let redisStatus = 'unknown';

  try {
    const pong = await getHealthRedis().ping();
    redisStatus = pong === 'PONG' ? 'ok' : 'degraded';
  } catch {
    redisStatus = 'error';
  }

  const healthy = redisStatus === 'ok';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'healthy' : 'degraded',
      redis: redisStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
}

// Suppress unused-variable lint for logger — keep for future use
void logger;
