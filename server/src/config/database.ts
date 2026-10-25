import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

let isConnected = false;

export async function connectDatabase(): Promise<boolean> {
  const uri = config.database.mongodbUri;

  if (!uri) {
    logger.warn('MONGODB_URI is not configured — running with Redis-only mode. Set MONGODB_URI in .env to connect MongoDB Atlas.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });

    isConnected = true;
    logger.info('MongoDB Atlas connected successfully ✓');
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('MongoDB connection error', { error: msg });
    return false;
  }
}

mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('Mongoose event: connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  logger.error('Mongoose event: connection error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('Mongoose event: disconnected from MongoDB');
});

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function closeDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly');
  }
}
