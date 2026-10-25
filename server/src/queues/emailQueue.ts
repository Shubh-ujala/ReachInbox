import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { EmailJobData, EmailJobResult } from '../types';

/**
 * The single email queue instance used by the API.
 * BullMQ's Queue uses one dedicated Redis connection.
 * QueueEvents uses a second dedicated connection for job lifecycle events.
 */
export const emailQueue = new Queue<EmailJobData, EmailJobResult>(config.queue.name, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: config.queue.jobAttempts,
    backoff: {
      type: 'exponential',
      delay: config.queue.jobBackoffDelay,
    },
    removeOnComplete: {
      count: 500,   // Keep last 500 completed jobs in Redis
      age: 7 * 24 * 60 * 60, // 7 days
    },
    removeOnFail: {
      count: 200,
      age: 14 * 24 * 60 * 60, // 14 days
    },
  },
});

/** QueueEvents listens to job lifecycle events (optional, useful for logging) */
export const emailQueueEvents = new QueueEvents(config.queue.name, {
  connection: createRedisConnection(),
});

emailQueueEvents.on('waiting',   ({ jobId }) => logger.debug(`Job ${jobId} waiting`));
emailQueueEvents.on('active',    ({ jobId }) => logger.info(`Job ${jobId} started processing`));
emailQueueEvents.on('completed', ({ jobId }) => logger.info(`Job ${jobId} completed`));
emailQueueEvents.on('failed',    ({ jobId, failedReason }) =>
  logger.error(`Job ${jobId} failed: ${failedReason}`)
);
emailQueueEvents.on('delayed',   ({ jobId, delay }) =>
  logger.debug(`Job ${jobId} delayed by ${delay}ms`)
);

emailQueue.on('error', (err: Error) => {
  logger.error('Email queue error', { message: err.message });
});

export async function closeQueue(): Promise<void> {
  await emailQueueEvents.close();
  await emailQueue.close();
  logger.info('Email queue closed gracefully');
}
