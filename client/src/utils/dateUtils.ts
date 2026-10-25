import type { JobStatus } from '../types';

/** Format an ISO-8601 UTC string into a human-readable local string */
export function formatDate(iso: string | undefined | null, timezone?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

/** Format epoch milliseconds */
export function formatEpoch(ms: number | undefined): string {
  if (!ms) return '—';
  return formatDate(new Date(ms).toISOString());
}

/** Human-readable relative time e.g. "in 2 hours" */
export function relativeTime(iso: string | undefined): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const isFuture = diff > 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';

  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) return `${prefix}${Math.round(abs / 60_000)}m${suffix}`;
  if (abs < 86_400_000) return `${prefix}${Math.round(abs / 3_600_000)}h${suffix}`;
  return `${prefix}${Math.round(abs / 86_400_000)}d${suffix}`;
}

/** Combine a local date + time + timezone into a UTC ISO-8601 string */
export function toUtcIso(date: string, time: string, timezone: string): string {
  // Parse the local date/time as if it were in the given timezone.
  // Intl is used to verify; actual conversion uses the timezone offset trick.
  const localStr = `${date}T${time}:00`;
  // Create a Date from a locale string scoped to the given timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(localStr));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const utcStr = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;

  // The offset between UTC and local time is what we need to subtract
  const local = new Date(localStr);
  const assumed = new Date(utcStr);
  const offsetMs = assumed.getTime() - local.getTime();
  const utc = new Date(local.getTime() - offsetMs);

  return utc.toISOString();
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  waiting: 'Waiting',
  delayed: 'Scheduled',
  active: 'Processing',
  completed: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
  unknown: 'Unknown',
};

export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];
