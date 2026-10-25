import 'dotenv/config';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { createEmailWorker } from './workers/emailWorker';
import { closeHealthRedis } from './config/redis';
import { verifySmtp } from './services/smtpService';
import { connectDatabase, closeDatabase } from './config/database';

/**
 * Worker entry point.
 */
async function start(): Promise<void> {
  logger.info('Starting email worker…');

  const warnings = validateConfig();
  for (const w of warnings) logger.warn(`Config: ${w}`);

  // Connect MongoDB Atlas if configured
  await connectDatabase();

  // Verify SMTP connectivity at startup — fail fast if creds are wrong
  try {
    await verifySmtp();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('SMTP verification failed — check SMTP_USER and SMTP_PASS', { message: msg });
  }

  const worker = createEmailWorker();
  logger.info(`📬 Email worker started [concurrency=${config.queue.workerConcurrency}]`);

  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — shutting down worker gracefully`);

    // close() waits for the currently-active job to finish before stopping
    await worker.close();
    await closeHealthRedis();
    await closeDatabase();
    logger.info('Worker shut down cleanly. Goodbye.');
    process.exit(0);
  }


  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException', (err: Error) => {
    logger.error('Worker uncaught exception', { message: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Worker unhandled rejection', { reason: String(reason) });
    process.exit(1);
  });
}

start().catch((err: Error) => {
  // eslint-disable-next-line no-console
  console.error('Worker failed to start:', err.message);
  process.exit(1);
});
