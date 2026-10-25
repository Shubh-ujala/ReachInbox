import request from 'supertest';
import app from '../src/app';

// Mock the BullMQ queue so tests don't need a real Redis
jest.mock('../src/queues/emailQueue', () => ({
  emailQueue: {
    add: jest.fn(),
    getJob: jest.fn(),
    getDelayed: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, delayed: 2, active: 0, completed: 5, failed: 1 }),
    close: jest.fn(),
  },
  emailQueueEvents: {
    on: jest.fn(),
    close: jest.fn(),
  },
  closeQueue: jest.fn(),
}));

// Mock Redis health check
jest.mock('../src/config/redis', () => ({
  createRedisConnection: jest.fn(() => ({ on: jest.fn() })),
  getHealthRedis: jest.fn(() => ({ ping: jest.fn().mockResolvedValue('PONG'), status: 'ready' })),
  closeHealthRedis: jest.fn(),
}));

const { emailQueue } = require('../src/queues/emailQueue');

const FUTURE_DATE = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

describe('POST /api/emails/schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    emailQueue.add.mockResolvedValue({ id: 'test-job-id' });
  });

  it('✅ schedules a valid email', async () => {
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        to: 'alice@example.com',
        subject: 'Hello Alice',
        body: 'This is a test email.',
        scheduledAt: FUTURE_DATE,
        timezone: 'America/New_York',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeDefined();
    expect(emailQueue.add).toHaveBeenCalledTimes(1);
  });

  it('❌ rejects an invalid email address', async () => {
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        to: 'not-an-email',
        subject: 'Test',
        body: 'Body',
        scheduledAt: FUTURE_DATE,
        timezone: 'UTC',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/email/i);
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('❌ rejects a missing subject', async () => {
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        to: 'alice@example.com',
        body: 'Body',
        scheduledAt: FUTURE_DATE,
        timezone: 'UTC',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('❌ rejects a past scheduledAt', async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        to: 'alice@example.com',
        subject: 'Past email',
        body: 'This is in the past.',
        scheduledAt: pastDate,
        timezone: 'UTC',
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/past/i);
  });

  it('❌ rejects an invalid timezone', async () => {
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        to: 'alice@example.com',
        subject: 'TZ test',
        body: 'Body',
        scheduledAt: FUTURE_DATE,
        timezone: 'Fake/Timezone',
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/timezone/i);
  });

  it('❌ rejects an empty body', async () => {
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        to: 'alice@example.com',
        subject: 'No body',
        body: '',
        scheduledAt: FUTURE_DATE,
        timezone: 'UTC',
      });

    expect(res.status).toBe(422);
  });

  it('✅ deduplicates on same idempotency key (409)', async () => {
    emailQueue.add.mockRejectedValueOnce(new Error('Job already exists'));

    const res = await request(app)
      .post('/api/emails/schedule')
      .set('X-Idempotency-Key', 'idem-key-123')
      .send({
        to: 'alice@example.com',
        subject: 'Dupe',
        body: 'Body',
        scheduledAt: FUTURE_DATE,
        timezone: 'UTC',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/emails/scheduled', () => {
  it('✅ returns list of scheduled emails', async () => {
    const res = await request(app).get('/api/emails/scheduled');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
  });
});

describe('GET /api/emails/sent', () => {
  it('✅ returns list of sent emails', async () => {
    const res = await request(app).get('/api/emails/sent');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/emails/failed', () => {
  it('✅ returns list of failed emails', async () => {
    const res = await request(app).get('/api/emails/failed');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/emails/:id', () => {
  it('✅ returns 404 for unknown job', async () => {
    emailQueue.getJob.mockResolvedValue(null);
    const res = await request(app).get('/api/emails/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/emails/:id', () => {
  it('✅ cancels a delayed job', async () => {
    emailQueue.getJob.mockResolvedValue({
      id: 'job-to-cancel',
      data: { to: 'test@test.com', subject: 'Test', body: 'B', scheduledAt: FUTURE_DATE, timezone: 'UTC', createdAt: new Date().toISOString(), idempotencyKey: 'job-to-cancel' },
      getState: jest.fn().mockResolvedValue('delayed'),
      remove: jest.fn().mockResolvedValue(undefined),
      opts: { delay: 1000 },
      timestamp: Date.now(),
      attemptsMade: 0,
    });

    const res = await request(app).delete('/api/emails/job-to-cancel');
    expect(res.status).toBe(200);
    expect(res.body.data.cancelled).toBe(true);
  });

  it('❌ rejects cancellation of active job', async () => {
    emailQueue.getJob.mockResolvedValue({
      id: 'active-job',
      data: {},
      getState: jest.fn().mockResolvedValue('active'),
      remove: jest.fn(),
      opts: {},
      timestamp: Date.now(),
      attemptsMade: 1,
    });

    const res = await request(app).delete('/api/emails/active-job');
    expect(res.status).toBe(409);
    expect(res.body.data?.cancelled ?? false).toBe(false);
  });
});

describe('GET /api/dashboard/stats', () => {
  it('✅ returns real aggregate stats', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.completed).toBe('number');
  });
});

describe('GET /api/health', () => {
  it('✅ returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.redis).toBe('ok');
  });
});

describe('404 handler', () => {
  it('✅ returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/doesnotexist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
