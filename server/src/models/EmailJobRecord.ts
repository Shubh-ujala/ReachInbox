import mongoose, { Document, Schema, Model } from 'mongoose';
import type { JobStatus } from '../types';

export interface IEmailJobRecord extends Document {
  jobId: string;
  userId?: mongoose.Types.ObjectId | string;
  to: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  timezone: string;
  status: JobStatus;
  idempotencyKey?: string;
  result?: {
    messageId?: string;
    previewUrl?: string;
    sentAt?: Date;
  };
  failedReason?: string;
  attemptsMade: number;
  processedOn?: Date;
  finishedOn?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailJobRecordSchema = new Schema<IEmailJobRecord>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: false,
    },
    to: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'delayed', 'active', 'completed', 'failed', 'cancelled', 'unknown'],
      default: 'delayed',
      index: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    result: {
      messageId: String,
      previewUrl: String,
      sentAt: Date,
    },
    failedReason: String,
    attemptsMade: {
      type: Number,
      default: 0,
    },
    processedOn: Date,
    finishedOn: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user jobs by status and schedule time
EmailJobRecordSchema.index({ userId: 1, status: 1, scheduledAt: -1 });

export const EmailJobRecord: Model<IEmailJobRecord> =
  mongoose.models.EmailJobRecord || mongoose.model<IEmailJobRecord>('EmailJobRecord', EmailJobRecordSchema);
