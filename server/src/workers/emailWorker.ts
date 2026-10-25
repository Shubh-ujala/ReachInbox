import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/smtpService';
import { EmailJobRecord } from '../models/EmailJobRecord';
import { isDbConnected } from '../config/database';
import type { EmailJobData, EmailJobResult } from '../types';

/**
 * BullMQ Worker — runs in a SEPARATE process from the API server.
 *
 * Why separate?
 * - The API must respond immediately; it must not block on SMTP calls.
 * - Workers can be scaled independently of API instances.
 * - A crashed worker does not take down the API, and vice versa.
 * - Delayed jobs survive restarts because they are stored in Redis,
 *   not in memory. When the worker reconnects it picks them up naturally.
 *
 * This file is the worker entry point (src/worker.ts).
 * On Render, deploy as a Background Worker with: node dist/worker.js
 */

export function createEmailWorker(): Worker<EmailJobData, EmailJobResult> {
  const worker = new Worker<EmailJobData, EmailJobResult>(
    config.queue.name,

    async (job: Job<EmailJobData, EmailJobResult>): Promise<EmailJobResult> => {
      logger.info(`Processing job ${job.id}`, {
        to: job.data.to,
        subject: job.data.subject,
        scheduledAt: job.data.scheduledAt,
        attempt: job.attemptsMade + 1,
      });

      // Update job progress so the API can show "active" status
      await job.updateProgress(10);

      const result = await sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        body: job.data.body,
        from: config.smtp.from || config.smtp.user,
      });

      await job.updateProgress(100);

      // Persist success result to MongoDB
      if (isDbConnected()) {
        await EmailJobRecord.findOneAndUpdate(
          { jobId: job.id },
          {
            status: 'completed',
            result: {
              messageId: result.messageId,
              previewUrl: result.previewUrl ?? undefined,
              sentAt: new Date(),
            },
            finishedOn: new Date(),
          }
        ).catch(() => {});
      }

      logger.info(`Job ${job.id} completed successfully`, {
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      });

      return {
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        sentAt: new Date().toISOString(),
      };
    },

    {
      connection: createRedisConnection(),
      concurrency: config.queue.workerConcurrency,
      // Limiter: at most 10 email sends per second across all workers
      limiter: { max: 10, duration: 1000 },
    }
  );

  worker.on('completed', (job: Job<EmailJobData, EmailJobResult>) => {
    logger.info(`✓ Job ${job.id} completed`, { to: job.data.to });
  });

  worker.on('failed', async (job: Job<EmailJobData, EmailJobResult> | undefined, err: Error) => {
    if (job) {
      if (isDbConnected()) {
        await EmailJobRecord.findOneAndUpdate(
          { jobId: job.id },
          {
            status: 'failed',
            failedReason: err.message,
            attemptsMade: job.attemptsMade,
          }
        ).catch(() => {});
      }
      logger.error(`✗ Job ${job.id} failed (attempt ${job.attemptsMade}/${config.queue.jobAttempts})`, {
        to: job.data.to,
        reason: err.message,
      });
    }
  });

  worker.on('error', (err: Error) => {
    logger.error('Worker error', { message: err.message });
  });

  worker.on('stalled', (jobId: string) => {
    logger.warn(`Job ${jobId} stalled — will be requeued`);
  });

  return worker;
}
