import { Redis, RedisOptions } from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

/** BullMQ-compatible IORedis options */
function buildBaseOpts(): RedisOptions {
  return {
    maxRetriesPerRequest: null,  // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis: too many retry attempts, giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 200, 3000);
      logger.warn(`Redis: retrying connection in ${delay}ms (attempt ${times})`);
      return delay;
    },
  };
}

/**
 * Create a fresh IORedis connection.
 * BullMQ requires a dedicated connection per Queue / Worker / QueueEvents instance,
 * so this factory is intentionally called multiple times.
 */
export function createRedisConnection(): Redis {
  const base = buildBaseOpts();
  let conn: Redis;

  if (config.redis.url) {
    // Auto-detect TLS from rediss:// scheme (Render, Upstash, etc.)
    const needsTls = config.redis.tls || config.redis.url.startsWith('rediss://');
    const opts: RedisOptions = {
      ...base,
      ...(needsTls ? { tls: { rejectUnauthorized: false } } : {}),
    };
    conn = new Redis(config.redis.url, opts);
  } else {
    conn = new Redis({
      ...base,
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      ...(config.redis.tls ? { tls: { rejectUnauthorized: false } } : {}),
    });
  }

  conn.on('connect',      () => logger.info('Redis: connected'));
  conn.on('ready',        () => logger.info('Redis: ready'));
  conn.on('error',        (err: Error) => logger.error('Redis: error', { message: err.message }));
  conn.on('close',        () => logger.warn('Redis: connection closed'));
  conn.on('reconnecting', () => logger.info('Redis: reconnecting…'));

  return conn;
}

/** Singleton for health-check pings from the API process */
let _healthConn: Redis | null = null;

export function getHealthRedis(): Redis {
  if (!_healthConn || _healthConn.status === 'end') {
    _healthConn = createRedisConnection();
  }
  return _healthConn;
}

export async function closeHealthRedis(): Promise<void> {
  if (_healthConn) {
    await _healthConn.quit().catch(() => { /* already closed */ });
    _healthConn = null;
    logger.info('Redis health connection closed');
  }
}

