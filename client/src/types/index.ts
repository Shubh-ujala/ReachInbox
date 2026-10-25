/** Mirror of server types — kept in sync manually */

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded string
  contentType?: string;
  size?: number; // bytes
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
  scheduledAt: string;
  timezone: string;
  createdAt: string;
  idempotencyKey: string;
  attachments?: EmailAttachment[];
}

export interface EmailJobResult {
  messageId: string;
  previewUrl: string | null;
  sentAt: string;
}

export interface EmailJob {
  id: string;
  status: JobStatus;
  data: EmailJobData;
  result?: EmailJobResult;
  failedReason?: string;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  timestamp: number;
  delay: number;
}

export interface DashboardStats {
  total: number;
  delayed: number;
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ScheduleEmailForm {
  to: string;
  subject: string;
  body: string;
  date: string;       // local date portion yyyy-MM-dd
  time: string;       // local time HH:mm
  timezone: string;
  attachments?: EmailAttachment[];
}

export interface UserProfile {
  id: string;
  clerkId?: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthResponse {
  user: UserProfile;
  token?: string;
}

export interface AuthConfig {
  clerkPublishableKey: string | null;
  isClerkConfigured: boolean;
}
