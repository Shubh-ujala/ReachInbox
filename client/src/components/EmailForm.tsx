import React, { useState, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { scheduleEmail } from '../services/api';
import { toUtcIso, COMMON_TIMEZONES } from '../utils/dateUtils';
import type { ScheduleEmailForm } from '../types';

function getLocalDefaults(): Pick<ScheduleEmailForm, 'date' | 'time' | 'timezone'> {
  const now = new Date();
  // +1 hour rounded to nearest 15 min
  const future = new Date(now.getTime() + 3_600_000);
  future.setMinutes(Math.ceil(future.getMinutes() / 15) * 15, 0, 0);

  const date = future.toLocaleDateString('sv-SE'); // yyyy-MM-dd
  const time = future.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }); // HH:mm

  // Detect browser timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return { date, time, timezone };
}

const INITIAL_FORM: ScheduleEmailForm = {
  to: '',
  subject: '',
  body: '',
  ...getLocalDefaults(),
};

export const EmailForm: React.FC = () => {
  const navigate = useNavigate();
  const uid = useId();

  const [form, setForm] = useState<ScheduleEmailForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ jobId: string; scheduledAt: string } | null>(null);

  const update = useCallback(
    <K extends keyof ScheduleEmailForm>(key: K, value: ScheduleEmailForm[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setError(null);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const scheduledAt = toUtcIso(form.date, form.time, form.timezone);

      // Validate client-side: must be in the future
      if (new Date(scheduledAt).getTime() < Date.now() - 30_000) {
        setError('The scheduled time must be in the future.');
        setSubmitting(false);
        return;
      }

      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const result = await scheduleEmail(
        { to: form.to, subject: form.subject, body: form.body, scheduledAt, timezone: form.timezone },
        idempotencyKey
      );

      setSuccess({ jobId: result.jobId, scheduledAt: result.scheduledAt });
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule email');
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = new Date().toLocaleDateString('sv-SE');

  return (
    <div className="max-w-2xl">
      {/* Success banner */}
      {success && (
        <div className="mb-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-md p-4 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Email scheduled successfully</p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 font-mono text-[11px]">
              Job ID: <span className="text-zinc-900 dark:text-zinc-200">{success.jobId}</span>
            </p>
            <div className="flex gap-2 mt-3">
              <button
                className="btn-primary text-xs"
                onClick={() => navigate(`/scheduled`)}
              >
                View Scheduled
              </button>
              <button
                className="btn-secondary text-xs"
                onClick={() => setSuccess(null)}
              >
                Schedule Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md p-3.5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-800 dark:text-rose-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="card p-6 space-y-5">
        {/* Recipient */}
        <div>
          <label htmlFor={`${uid}-to`} className="label">
            Recipient Email <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${uid}-to`}
            type="email"
            className="input"
            placeholder="recipient@example.com"
            value={form.to}
            onChange={(e) => update('to', e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {/* Subject */}
        <div>
          <label htmlFor={`${uid}-subject`} className="label">
            Subject <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${uid}-subject`}
            type="text"
            className="input"
            placeholder="Enter email subject"
            value={form.subject}
            onChange={(e) => update('subject', e.target.value)}
            required
            maxLength={998}
          />
        </div>

        {/* Body */}
        <div>
          <label htmlFor={`${uid}-body`} className="label">
            Email Body <span className="text-rose-500">*</span>
          </label>
          <textarea
            id={`${uid}-body`}
            className="input resize-y"
            placeholder="Enter the email content…"
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            required
            rows={6}
          />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${uid}-date`} className="label">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              id={`${uid}-date`}
              type="date"
              className="input"
              value={form.date}
              min={minDate}
              onChange={(e) => update('date', e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${uid}-time`} className="label">
              Time <span className="text-rose-500">*</span>
            </label>
            <input
              id={`${uid}-time`}
              type="time"
              className="input"
              value={form.time}
              onChange={(e) => update('time', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor={`${uid}-tz`} className="label">
            Timezone <span className="text-rose-500">*</span>
          </label>
          <select
            id={`${uid}-tz`}
            className="input"
            value={form.timezone}
            onChange={(e) => update('timezone', e.target.value)}
            required
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            The date and time above are interpreted in this timezone and converted to UTC internally.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            id="schedule-submit-btn"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</>
              : <><Send className="w-4 h-4" /> Schedule Email</>
            }
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">All fields are required</span>
        </div>
      </form>
    </div>
  );
};
