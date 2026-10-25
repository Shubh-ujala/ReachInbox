import { scheduleEmailSchema } from '../src/validators/emailValidator';

const FUTURE = new Date(Date.now() + 3_600_000).toISOString();

describe('scheduleEmailSchema', () => {
  const valid = {
    to: 'user@example.com',
    subject: 'Weekly digest',
    body: 'Hello there!',
    scheduledAt: FUTURE,
    timezone: 'Europe/London',
  };

  it('✅ accepts a fully valid payload', () => {
    expect(scheduleEmailSchema.safeParse(valid).success).toBe(true);
  });

  it('❌ rejects missing to', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, to: undefined });
    expect(r.success).toBe(false);
  });

  it('❌ rejects malformed email', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, to: 'not@@an.email' });
    expect(r.success).toBe(false);
  });

  it('❌ rejects empty subject', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, subject: '' });
    expect(r.success).toBe(false);
  });

  it('❌ rejects empty body', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, body: '' });
    expect(r.success).toBe(false);
  });

  it('❌ rejects past scheduledAt', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, scheduledAt: new Date(Date.now() - 120_000).toISOString() });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].message).toMatch(/past/i);
    }
  });

  it('❌ rejects non-ISO scheduledAt', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, scheduledAt: '25-10-2026 10:00' });
    expect(r.success).toBe(false);
  });

  it('❌ rejects invalid timezone', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, timezone: 'Mars/Olympus' });
    expect(r.success).toBe(false);
  });

  it('✅ accepts UTC timezone', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, timezone: 'UTC' });
    expect(r.success).toBe(true);
  });

  it('✅ accepts Asia/Kolkata timezone', () => {
    const r = scheduleEmailSchema.safeParse({ ...valid, timezone: 'Asia/Kolkata' });
    expect(r.success).toBe(true);
  });
});
