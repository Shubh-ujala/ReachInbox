/**
 * Shared TypeScript types — used by both API routes and the worker.
 */

export interface ScheduleEmailPayload {
  to: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO-8601 UTC string
  timezone: string;    // IANA timezone name e.g. "America/New_York"
}

export type JobStatus =
  | 'waiting'
  | 'delayed'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unknown';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  scheduledAt: string;   // ISO-8601 UTC
  timezone: string;
  createdAt: string;     // ISO-8601 UTC
  idempotencyKey: string;
}

export interface EmailJobResult {
  messageId: string;
  previewUrl: string | null;
  sentAt: string;        // ISO-8601 UTC
}

export interface EmailJobSummary {
  id: string;
  status: JobStatus;
  data: EmailJobData;
  result?: EmailJobResult;
  failedReason?: string;
  attemptsMade: number;
  processedOn?: number;  // epoch ms
  finishedOn?: number;   // epoch ms
  timestamp: number;     // job creation epoch ms
  delay: number;         // ms until processing
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  total: number;
  delayed: number;
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
}
