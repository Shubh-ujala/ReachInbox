import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { emailRouter, dashboardRouter, healthRouter, authRouter } from './routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/errorMiddleware';

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Allow Vercel, localhost, and configured frontend URL
    if (
      config.cors.frontendUrl === '*' ||
      origin === config.cors.frontendUrl ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Idempotency-Key', 'Authorization'],
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

const scheduleLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: 'Too many schedule requests, slow down' },
});

app.use(limiter);

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (config.server.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);
app.use('/api/emails', emailRouter);
// Apply stricter rate limit on scheduling endpoint
app.use('/api/emails/schedule', scheduleLimiter);
app.use('/api/dashboard', dashboardRouter);

// ── Fallbacks ─────────────────────────────────────────────────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
