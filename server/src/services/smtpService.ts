import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

let _transporter: Transporter | null = null;

/**
 * Lazy-initialised Nodemailer transporter.
 * Uses Ethereal SMTP for testing — emails are captured and visible at
 * https://ethereal.email/ under the configured account.
 *
 * NOTE: Ethereal accepts SMTP submissions but does NOT deliver to real inboxes.
 * A successful send here means the message was accepted by Ethereal's SMTP server,
 * NOT that a real recipient has received it.
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
      secure: false,         // Ethereal uses STARTTLS on 587
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      tls: {
        rejectUnauthorized: false, // Ethereal uses a self-signed cert in some regions
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

import type { EmailAttachment } from '../types';

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
 * Send an email via Nodemailer.
 * Returns the message ID and delivery preview URL if available.
 *
 * Throws on SMTP error — BullMQ will catch the throw and mark the job as failed,
 * then retry according to the backoff policy.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
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

/** Verify SMTP credentials at worker startup */
export async function verifySmtp(): Promise<void> {
  const transporter = getTransporter();
  await transporter.verify();
  logger.info('SMTP connection verified ✓');
}
