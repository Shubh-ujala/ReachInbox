import axios from 'axios';
import type { ApiResponse, EmailJob, DashboardStats, UserProfile, AuthConfig } from '../types';

/**
 * Centralised API service layer.
 * All components import from here — no fetch/axios calls scattered in components.
 * The base URL is set via VITE_API_URL env var (falls back to /api for local proxy).
 */

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Clerk JWT token or stored session token to requests
api.interceptors.request.use(async (reqConfig) => {
  let token: string | null = null;

  // 1. Check if window.Clerk is loaded with active session
  if (typeof window !== 'undefined' && window.Clerk?.session) {
    try {
      token = await window.Clerk.session.getToken();
    } catch {
      // ignore
    }
  }

  // 2. Fallback to localStorage token if Clerk session is pending
  if (!token && typeof localStorage !== 'undefined') {
    token = localStorage.getItem('reachinbox_jwt_token');
  }

  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }

  return reqConfig;
});

// ── Error normalisation ───────────────────────────────────────────────────────

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as ApiResponse<unknown>)?.error
      ?? err.message
      ?? 'Network error';
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<{ status: string; redis: string; uptime: number }> {
  const { data } = await api.get<ApiResponse<{ status: string; redis: string; uptime: number }>>('/health');
  if (!data.success || !data.data) throw new Error('Health check failed');
  return data.data;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<DashboardStats> {
  try {
    const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    if (!data.success || !data.data) throw new Error('No stats returned');
    return data.data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export interface SchedulePayload {
  to: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO-8601 UTC
  timezone: string;
}

export async function scheduleEmail(
  payload: SchedulePayload,
  idempotencyKey?: string
): Promise<{ jobId: string; scheduledAt: string; delay: number }> {
  try {
    const { data } = await api.post<ApiResponse<{ jobId: string; scheduledAt: string; delay: number }>>(
      '/emails/schedule',
      payload,
      idempotencyKey ? { headers: { 'X-Idempotency-Key': idempotencyKey } } : {}
    );
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed to schedule email');
    return data.data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ── List endpoints ────────────────────────────────────────────────────────────

export async function fetchScheduledEmails(): Promise<EmailJob[]> {
  try {
    const { data } = await api.get<ApiResponse<{ jobs: EmailJob[]; count: number }>>('/emails/scheduled');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed to fetch scheduled emails');
    return data.data.jobs;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function fetchSentEmails(): Promise<EmailJob[]> {
  try {
    const { data } = await api.get<ApiResponse<{ jobs: EmailJob[]; count: number }>>('/emails/sent');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed to fetch sent emails');
    return data.data.jobs;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function fetchFailedEmails(): Promise<EmailJob[]> {
  try {
    const { data } = await api.get<ApiResponse<{ jobs: EmailJob[]; count: number }>>('/emails/failed');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed to fetch failed emails');
    return data.data.jobs;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function fetchEmailById(id: string): Promise<EmailJob> {
  try {
    const { data } = await api.get<ApiResponse<EmailJob>>(`/emails/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Job not found');
    return data.data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function cancelEmail(id: string): Promise<{ cancelled: boolean; reason: string }> {
  try {
    const { data } = await api.delete<ApiResponse<{ cancelled: boolean; reason: string }>>(`/emails/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed to cancel job');
    return data.data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ── Auth Endpoints ────────────────────────────────────────────────────────────

export async function syncUserWithBackend(profile: {
  clerkId: string;
  email: string;
  name?: string;
  avatar?: string;
}): Promise<UserProfile> {
  try {
    const { data } = await api.post<ApiResponse<{ user: UserProfile }>>('/auth/sync', profile);
    if (!data.success || !data.data) throw new Error(data.error ?? 'User sync failed');
    return data.data.user;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function fetchMe(): Promise<UserProfile> {
  try {
    const { data } = await api.get<ApiResponse<{ user: UserProfile }>>('/auth/me');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Not authenticated');
    return data.data.user;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  try {
    const { data } = await api.get<ApiResponse<AuthConfig>>('/auth/config');
    if (!data.success || !data.data) throw new Error('Could not load auth configuration');
    return data.data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}
