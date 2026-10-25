import 'dotenv/config';

/**
 * Centralized, typed configuration.
 * All process.env access is done here — nowhere else.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function optionalInt(name: string, fallback: number): number {
  const val = process.env[name];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) throw new Error(`${name} must be an integer, got "${val}"`);
  return parsed;
}

export const config = {
  server: {
    port: optionalInt('PORT', 3001),
    nodeEnv: optional('NODE_ENV', 'development'),
    get isDev() { return this.nodeEnv === 'development'; },
    get isProd() { return this.nodeEnv === 'production'; },
  },

  redis: {
    url: optional('REDIS_URL', ''),
    host: optional('REDIS_HOST', 'localhost'),
    port: optionalInt('REDIS_PORT', 6379),
    password: optional('REDIS_PASSWORD', ''),
    tls: optional('REDIS_TLS', 'false') === 'true',
  },

  smtp: {
    host: optional('SMTP_HOST', 'smtp.ethereal.email'),
    port: optionalInt('SMTP_PORT', 587),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('SMTP_FROM', ''),
  },

  cors: {
    frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
  },

  queue: {
    name: 'email-queue',
    workerConcurrency: optionalInt('WORKER_CONCURRENCY', 5),
    jobAttempts: optionalInt('JOB_ATTEMPTS', 3),
    jobBackoffDelay: optionalInt('JOB_BACKOFF_DELAY', 5000),
  },

  database: {
    mongodbUri: optional('MONGODB_URI', ''),
  },

  auth: {
    jwtSecret: optional('JWT_SECRET', 'reachinbox-jwt-secret-key-super-secure-32chars!'),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  clerk: {
    publishableKey: optional('CLERK_PUBLISHABLE_KEY', optional('VITE_CLERK_PUBLISHABLE_KEY', '')),
    secretKey: optional('CLERK_SECRET_KEY', ''),
  },
} as const;


/** Call once at startup to surface config problems early */
export function validateConfig(): string[] {
  const warnings: string[] = [];

  if (!config.smtp.user) warnings.push('SMTP_USER is not set — email sending will fail');
  if (!config.smtp.pass) warnings.push('SMTP_PASS is not set — email sending will fail');
  if (!config.smtp.from) warnings.push('SMTP_FROM is not set — will use SMTP_USER as sender');

  if (!config.redis.url && !config.redis.host) {
    throw new Error('Neither REDIS_URL nor REDIS_HOST is configured');
  }

  return warnings;
}
