import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { EmailAttachment } from '../types';

// ─── Provider abstraction ────────────────────────────────────────────────────

/**
 * The app supports two email providers:
 *
 * 1. **Resend** (recommended for production)
 *    - Uses HTTP API → works on Render, Railway, Vercel, etc. where SMTP ports are blocked
 *    - Activated when `RESEND_API_KEY` is set
 *
 * 2. **Nodemailer / SMTP** (local development)
 *    - Uses SMTP protocol (port 587) — fine for local Docker / Ethereal / Gmail dev
 *    - Falls back to this when no `RESEND_API_KEY` is configured
 */

let _resend: Resend | null = null;
let _transporter: Transporter | null = null;

function useResend(): boolean {
  return !!config.resend.apiKey;
}

function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(config.resend.apiKey);
    logger.info('Resend client initialised (HTTP API mode)');
  }
  return _resend;
}

/**
 * Lazy-initialised Nodemailer transporter.
 * Used for local development / Ethereal testing when RESEND_API_KEY is not set.
 */
function getTransporter(): Transporter {
  if (!_transporter) {
    if (!config.smtp.user || !config.smtp.pass) {
      throw new Error(
        'SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS in your .env file. ' +
        'Generate a free test account at https://ethereal.email/create'
      );
    }

    _transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false,         // STARTTLS on 587
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      tls: {
        rejectUnauthorized: false, // Ethereal uses self-signed certs in some regions
      },
    });

    logger.info('SMTP transporter initialised', {
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user,
    });
  }

  return _transporter;
}

// ─── Public interface ────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | null;
}

/**
 * Send an email via the active provider (Resend or Nodemailer).
 *
 * Throws on send error — BullMQ will catch and retry per the backoff policy.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (useResend()) {
    return sendViaResend(opts);
  }
  return sendViaNodemailer(opts);
}

// ─── Resend implementation ───────────────────────────────────────────────────

async function sendViaResend(opts: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResendClient();
  const from = opts.from || config.resend.from;

  const resendAttachments = opts.attachments?.map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content, 'base64'),
    content_type: att.contentType,
  }));

  const { data, error } = await resend.emails.send({
    from,
    to: [opts.to],
    subject: opts.subject,
    text: opts.body,
    html: `<div style="font-family:sans-serif;line-height:1.6">${opts.body.replace(/\n/g, '<br>')}</div>`,
    attachments: resendAttachments,
  });

  if (error) {
    logger.error('Resend API error', { error: error.message, name: error.name });
    throw new Error(`Resend send failed: ${error.message}`);
  }

  const messageId = data?.id ?? 'unknown';

  logger.info('Email sent via Resend', {
    messageId,
    to: opts.to,
    subject: opts.subject,
  });

  return {
    messageId,
    previewUrl: null, // Resend doesn't have preview URLs like Ethereal
  };
}

// ─── Nodemailer implementation ───────────────────────────────────────────────

async function sendViaNodemailer(opts: SendEmailOptions): Promise<SendEmailResult> {
  const transporter = getTransporter();
  const from = opts.from || config.smtp.from || config.smtp.user;

  const info: SentMessageInfo = await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    html: `<div style="font-family:sans-serif;line-height:1.6">${opts.body.replace(/\n/g, '<br>')}</div>`,
    attachments: opts.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      encoding: 'base64',
      contentType: att.contentType,
    })),
  });

  // nodemailer.getTestMessageUrl returns the Ethereal preview link (string | false)
  const previewUrl = nodemailer.getTestMessageUrl(info);
  const previewUrlStr = typeof previewUrl === 'string' ? previewUrl : null;

  logger.info('Email sent via SMTP', {
    messageId: info.messageId,
    to: opts.to,
    subject: opts.subject,
    previewUrl: previewUrlStr,
  });

  return {
    messageId: info.messageId,
    previewUrl: previewUrlStr,
  };
}

/** Verify email provider connectivity at startup */
export async function verifySmtp(): Promise<void> {
  if (useResend()) {
    logger.info('Resend API key configured — using HTTP API for email delivery ✓');
    // No verification call needed; Resend validates on first send
    return;
  }

  const transporter = getTransporter();
  await transporter.verify();
  logger.info('SMTP connection verified ✓');
}
