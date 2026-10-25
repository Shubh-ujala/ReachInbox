import 'dotenv/config';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import app from './app';
import { closeQueue } from './queues/emailQueue';
import { closeHealthRedis } from './config/redis';
import { connectDatabase, closeDatabase } from './config/database';
import { createEmailWorker } from './workers/emailWorker';
import { verifySmtp } from './services/smtpService';
import type { Worker } from 'bullmq';

async function start(): Promise<void> {
  // Validate config and surface warnings
  const warnings = validateConfig();
  for (const w of warnings) logger.warn(`Config: ${w}`);

  // Connect to MongoDB Atlas
  await connectDatabase();

  let inProcessWorker: Worker | null = null;

  // Optional: run worker inside same process (ideal for single-container hosting on Render / Railway)
  if (process.env.RUN_WORKER_IN_PROCESS === 'true') {
    try {
      await verifySmtp();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('SMTP verification failed — check SMTP credentials', { message: msg });
    }
    inProcessWorker = createEmailWorker();
    logger.info('📬 In-process BullMQ email worker started alongside API server');
  }

  const server = app.listen(config.server.port, () => {
    logger.info(`🚀 API server running on port ${config.server.port} [${config.server.nodeEnv}]`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — shutting down gracefully`);

    server.close(async () => {
      logger.info('HTTP server closed');
      if (inProcessWorker) {
        await inProcessWorker.close();
        logger.info('In-process worker closed');
      }
      await closeQueue();
      await closeHealthRedis();
      await closeDatabase();
      logger.info('All connections closed. Goodbye.');
      process.exit(0);
    });

    // Force exit after 10 s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    process.exit(1);
  });
}

start().catch((err: Error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
