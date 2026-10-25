import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Trash2, Eye, Inbox } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/States';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { cancelEmail } from '../services/api';
import { formatDate, formatEpoch } from '../utils/dateUtils';
import type { EmailJob } from '../types';

interface EmailTableProps {
  jobs: EmailJob[];
  showCancel?: boolean;
  onCancelled?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  jobs,
  showCancel = false,
  onCancelled,
  emptyTitle = 'No emails found',
  emptyDescription,
}) => {
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState<EmailJob | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelEmail(cancelTarget.id);
      setCancelTarget(null);
      onCancelled?.();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="w-10 h-10" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr>
              <th className="table-th">Recipient</th>
              <th className="table-th">Subject</th>
              <th className="table-th">Scheduled At</th>
              <th className="table-th">Status</th>
              <th className="table-th text-center">Attempts</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                <td className="table-td">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[180px] block" title={job.data.to}>
                    {job.data.to}
                  </span>
                </td>
                <td className="table-td">
                  <span className="truncate max-w-[200px] block text-zinc-700 dark:text-zinc-300" title={job.data.subject}>
                    {job.data.subject}
                  </span>
                </td>
                <td className="table-td whitespace-nowrap font-mono text-[11px]">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {formatDate(job.data.scheduledAt, job.data.timezone)}
                  </span>
                  {job.finishedOn && (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Processed: {formatEpoch(job.finishedOn)}
                    </div>
                  )}
                </td>
                <td className="table-td">
                  <StatusBadge status={job.status} size="sm" />
                  {job.failedReason && (
                    <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 mt-1 max-w-[200px] truncate" title={job.failedReason}>
                      {job.failedReason}
                    </div>
                  )}
                </td>
                <td className="table-td text-center font-mono text-zinc-500 dark:text-zinc-400">
                  <span>{job.attemptsMade}</span>
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-1">
                    {/* Detail view */}
                    <button
                      onClick={() => navigate(`/emails/${job.id}`)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Ethereal preview */}
                    {job.result?.previewUrl && (
                      <a
                        href={job.result.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Preview email"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Cancel */}
                    {showCancel && (job.status === 'delayed' || job.status === 'waiting') && (
                      <button
                        onClick={() => { setCancelTarget(job); setCancelError(null); }}
                        className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Cancel job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cancel confirmation modal */}
      <ConfirmationModal
        isOpen={!!cancelTarget}
        title="Cancel scheduled email?"
        message={cancelTarget
          ? `This will remove the scheduled email to ${cancelTarget.data.to}. This action cannot be undone.`
          : ''}
        confirmLabel="Yes, cancel it"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => { setCancelTarget(null); setCancelError(null); }}
      />

      {cancelError && (
        <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">
          {cancelError}
        </div>
      )}
    </>
  );
};
