import { createLogger, format, transports } from 'winston';
import { config } from '../config';

const { combine, timestamp, errors, json, colorize, printf } = format;

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${(stack as string) || message}${metaStr}`;
});

export const logger = createLogger({
  level: config.server.isDev ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.server.isDev
      ? combine(colorize(), devFormat)
      : json()
  ),
  transports: [new transports.Console()],
});

const SENSITIVE_KEYS = new Set([
  'password', 'pass', 'secret', 'token', 'auth',
  'SMTP_PASS', 'REDIS_PASSWORD', 'authorization',
]);

/** Strip sensitive fields before logging */
export function sanitize<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of SENSITIVE_KEYS) {
    if (key in out) (out as Record<string, unknown>)[key] = '[REDACTED]';
  }
  return out;
}
