import { z } from 'zod';

// Valid IANA timezone list check — Intl is available in Node 18+
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const scheduleEmailSchema = z.object({
  to: z
    .string({ required_error: 'Recipient email is required' })
    .email('Must be a valid email address')
    .max(320, 'Email address too long'),

  subject: z
    .string({ required_error: 'Subject is required' })
    .min(1, 'Subject cannot be empty')
    .max(998, 'Subject exceeds RFC 5321 limit'),

  body: z
    .string({ required_error: 'Body is required' })
    .min(1, 'Body cannot be empty')
    .max(100_000, 'Body is too large (max 100 000 characters)'),

  scheduledAt: z
    .string({ required_error: 'scheduledAt is required' })
    .datetime({ message: 'scheduledAt must be a valid ISO-8601 UTC datetime string' }),

  timezone: z
    .string({ required_error: 'timezone is required' })
    .refine(isValidTimezone, { message: 'timezone must be a valid IANA timezone name' }),
}).superRefine((data, ctx) => {
  const now = Date.now();
  const scheduled = new Date(data.scheduledAt).getTime();

  if (isNaN(scheduled)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scheduledAt is not a valid date', path: ['scheduledAt'] });
    return;
  }

  // Allow 30 s of clock skew
  if (scheduled < now - 30_000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cannot schedule an email in the past',
      path: ['scheduledAt'],
    });
  }
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
