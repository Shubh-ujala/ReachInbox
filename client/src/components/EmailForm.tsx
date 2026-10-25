import React, { useState, useCallback, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, AlertCircle, CheckCircle2, Paperclip, X, FileText } from 'lucide-react';
import { scheduleEmail } from '../services/api';
import { toUtcIso, COMMON_TIMEZONES } from '../utils/dateUtils';
import type { ScheduleEmailForm, EmailAttachment } from '../types';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ScheduleEmailForm>(INITIAL_FORM);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [readingFiles, setReadingFiles] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 10) {
      setError('You can attach a maximum of 10 files.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setReadingFiles(true);
    setError(null);

    try {
      const newAttachments: EmailAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 5MB file size limit.`);
        }

        const base64 = await readFileAsBase64(file);
        newAttachments.push({
          filename: file.name,
          content: base64,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }

      const totalSize = [...attachments, ...newAttachments].reduce((acc, curr) => acc + (curr.size || 0), 0);
      if (totalSize > 10 * 1024 * 1024) {
        throw new Error('Total attachment size exceeds the 10MB limit.');
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read attached file');
    } finally {
      setReadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

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
        {
          to: form.to,
          subject: form.subject,
          body: form.body,
          scheduledAt,
          timezone: form.timezone,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
        idempotencyKey
      );

      setSuccess({ jobId: result.jobId, scheduledAt: result.scheduledAt });
      setForm(INITIAL_FORM);
      setAttachments([]);
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

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label mb-0">
              Attachments <span className="text-zinc-400 font-normal text-[11px]">(Optional, max 10 files / 10MB)</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={readingFiles || attachments.length >= 10}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200 dark:border-zinc-750 disabled:opacity-50"
            >
              {readingFiles ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              <span>{readingFiles ? 'Loading…' : 'Attach Files'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {attachments.map((att, idx) => (
                <div
                  key={`${att.filename}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-800 dark:text-zinc-200 text-xs" title={att.filename}>
                        {att.filename}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {att.size ? formatBytes(att.size) : 'File'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-1 text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
