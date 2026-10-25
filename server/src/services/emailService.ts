import { Job } from 'bullmq';
import { emailQueue } from '../queues/emailQueue';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScheduleEmailPayload,
  EmailJobData,
  EmailJobResult,
  EmailJobSummary,
  JobStatus,
  DashboardStats,
} from '../types';

/**
 * Schedule an email as a BullMQ delayed job.
 *
 * The delay is calculated as (scheduledAt - now). BullMQ stores the job in Redis
 * with this delay; the worker picks it up when the timer expires — no polling needed.
 *
 * Idempotency: the caller may supply an idempotencyKey. If a job with the same
 * key already exists in the delayed set BullMQ will NOT create a duplicate because
 * we use the key as the BullMQ job ID. BullMQ rejects duplicate IDs, which we
 * handle gracefully.
 */
import { EmailJobRecord } from '../models/EmailJobRecord';
import { isDbConnected } from '../config/database';

export async function scheduleEmail(
  payload: ScheduleEmailPayload,
  idempotencyKey?: string,
  userId?: string
): Promise<{ jobId: string; scheduledAt: string; delay: number }> {
  const scheduledAt = new Date(payload.scheduledAt);
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  const jobId = idempotencyKey ?? `email-${uuidv4()}`;
  const createdAt = new Date().toISOString();

  const jobData: EmailJobData = {
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
    scheduledAt: payload.scheduledAt,
    timezone: payload.timezone,
    createdAt,
    idempotencyKey: jobId,
    attachments: payload.attachments,
  };

  try {
    const job = await emailQueue.add(jobId, jobData, {
      jobId,          // Makes job ID deterministic — deduplicates on retry
      delay,
    });

    // Persist to MongoDB Atlas if connected
    if (isDbConnected()) {
      try {
        await EmailJobRecord.findOneAndUpdate(
          { jobId: job.id },
          {
            jobId: job.id,
            userId: userId || undefined,
            to: payload.to,
            subject: payload.subject,
            body: payload.body,
            scheduledAt,
            timezone: payload.timezone,
            status: 'delayed',
            idempotencyKey: jobId,
            attemptsMade: 0,
          },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        logger.warn('Could not save job to MongoDB', { error: String(dbErr) });
      }
    }

    logger.info('Email job scheduled', {
      jobId: job.id,
      to: payload.to,
      scheduledAt: payload.scheduledAt,
      delay,
    });

    return { jobId: job.id!, scheduledAt: payload.scheduledAt, delay };
  } catch (err: unknown) {
    // BullMQ throws if a job with the same ID already exists
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already exists')) {
      logger.warn('Duplicate job submission rejected', { jobId });
      throw Object.assign(new Error('A job with this ID already exists (duplicate request)'), {
        statusCode: 409,
      });
    }
    throw err;
  }
}


/** Normalise a raw BullMQ job into our summary shape */
function toSummary(job: Job<EmailJobData, EmailJobResult>): EmailJobSummary {
  const statusKey = (job as unknown as { _status?: string })._status as string | undefined;
  return {
    id: job.id!,
    status: (statusKey ?? 'unknown') as JobStatus,
    data: job.data,
    result: job.returnvalue ?? undefined,
    failedReason: job.failedReason ?? undefined,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn ?? undefined,
    finishedOn: job.finishedOn ?? undefined,
    timestamp: job.timestamp,
    delay: job.opts.delay ?? 0,
  };
}

/** Get a single job by ID (null if not found / expired) */
export async function getJobById(id: string): Promise<EmailJobSummary | null> {
  const job = await emailQueue.getJob(id);
  if (!job) return null;

  const state = await job.getState();
  (job as unknown as Record<string, unknown>)._status = state;
  return toSummary(job);
}

/** Fetch delayed (scheduled but not yet due) jobs */
export async function getDelayedJobs(start = 0, end = 99): Promise<EmailJobSummary[]> {
  const jobs = await emailQueue.getDelayed(start, end);
  return jobs.map((j) => {
    (j as unknown as Record<string, unknown>)._status = 'delayed';
    return toSummary(j);
  });
}

/** Fetch waiting jobs (delay has elapsed but worker hasn't picked up yet) */
export async function getWaitingJobs(start = 0, end = 99): Promise<EmailJobSummary[]> {
  const jobs = await emailQueue.getWaiting(start, end);
  return jobs.map((j) => {
    (j as unknown as Record<string, unknown>)._status = 'waiting';
    return toSummary(j);
  });
}

/** Fetch active jobs (currently being processed) */
export async function getActiveJobs(): Promise<EmailJobSummary[]> {
  const jobs = await emailQueue.getActive();
  return jobs.map((j) => {
    (j as unknown as Record<string, unknown>)._status = 'active';
    return toSummary(j);
  });
}

/** Fetch completed jobs (successfully sent) */
export async function getCompletedJobs(start = 0, end = 99): Promise<EmailJobSummary[]> {
  const jobs = await emailQueue.getCompleted(start, end);
  return jobs.map((j) => {
    (j as unknown as Record<string, unknown>)._status = 'completed';
    return toSummary(j);
  });
}

/** Fetch failed jobs */
export async function getFailedJobs(start = 0, end = 99): Promise<EmailJobSummary[]> {
  const jobs = await emailQueue.getFailed(start, end);
  return jobs.map((j) => {
    (j as unknown as Record<string, unknown>)._status = 'failed';
    return toSummary(j);
  });
}

/**
 * Cancel a job.
 * Only delayed or waiting jobs can be safely removed; active jobs cannot be
 * interrupted without risking a partial send.
 */
export async function cancelJob(id: string): Promise<{ cancelled: boolean; reason: string }> {
  const job = await emailQueue.getJob(id);
  if (!job) {
    return { cancelled: false, reason: 'Job not found — it may have already been processed or expired' };
  }

  const state = await job.getState();

  if (state === 'completed') {
    return { cancelled: false, reason: 'Job already completed — email was sent' };
  }
  if (state === 'active') {
    return { cancelled: false, reason: 'Job is currently being processed and cannot be safely cancelled' };
  }
  if (state === 'failed') {
    await job.remove();
    return { cancelled: true, reason: 'Failed job removed from queue' };
  }

  // delayed, waiting → safe to remove
  await job.remove();
  if (isDbConnected()) {
    await EmailJobRecord.findOneAndUpdate({ jobId: id }, { status: 'cancelled' }).catch(() => {});
  }
  logger.info(`Job ${id} cancelled (was ${state})`);
  return { cancelled: true, reason: `Job cancelled successfully (was ${state})` };
}

/** Aggregate stats for the dashboard */
export async function getDashboardStats(): Promise<DashboardStats> {
  const counts = await emailQueue.getJobCounts(
    'waiting', 'delayed', 'active', 'completed', 'failed'
  );

  return {
    total: (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.active ?? 0)
         + (counts.completed ?? 0) + (counts.failed ?? 0),
    delayed: counts.delayed ?? 0,
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    cancelled: 0, // BullMQ tracks removed jobs as gone; we approximate as 0
  };
}
