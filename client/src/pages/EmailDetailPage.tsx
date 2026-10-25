import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail, Calendar, Clock, Hash, RefreshCw, Paperclip, FileText } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState, ErrorMessage } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { fetchEmailById } from '../services/api';
import { formatDate, formatEpoch } from '../utils/dateUtils';

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      <div className="flex-shrink-0 w-7 h-7 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <div className="text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export const EmailDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchFn = useCallback(() => fetchEmailById(id!), [id]);
  const { data: job, loading, error, refetch } = useFetch(fetchFn, 10_000);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Email Job Details</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{id}</p>
        </div>
        <button onClick={refetch} className="ml-auto p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading && !job && <LoadingState message="Loading job details…" />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {job && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Job Metadata</h2>
                <StatusBadge status={job.status} size="sm" />
              </div>

              <DetailRow icon={Mail}     label="Recipient"      value={<span className="font-medium text-zinc-900 dark:text-zinc-100">{job.data.to}</span>} />
              <DetailRow icon={Mail}     label="Subject"        value={job.data.subject} />
              <DetailRow icon={Calendar} label="Scheduled At"   value={<span className="font-mono text-[11px]">{formatDate(job.data.scheduledAt, job.data.timezone)}</span>} />
              <DetailRow icon={Clock}    label="Created At"     value={<span className="font-mono text-[11px]">{formatDate(job.data.createdAt)}</span>} />
              <DetailRow icon={Clock}    label="Timezone"       value={<code className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{job.data.timezone}</code>} />
              <DetailRow icon={Hash}     label="Job ID"         value={<code className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{job.id}</code>} />
              <DetailRow icon={Hash}     label="Idempotency Key" value={<code className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{job.data.idempotencyKey}</code>} />
            </div>

            {/* Email body */}
            <div className="card p-5">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">Message Body</h2>
              <pre className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 leading-relaxed">
                {job.data.body}
              </pre>
            </div>

            {/* Attachments */}
            {job.data.attachments && job.data.attachments.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Attachments ({job.data.attachments.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {job.data.attachments.map((att, idx) => (
                    <div
                      key={`${att.filename}-${idx}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs"
                    >
                      <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-800 dark:text-zinc-200" title={att.filename}>
                          {att.filename}
                        </p>
                        {att.size ? (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar metadata */}
          <div className="space-y-4">
            {/* Processing info */}
            <div className="card p-5">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-4">Processing Info</h2>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Attempts</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{job.attemptsMade} / 3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Processed</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatEpoch(job.processedOn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Finished</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatEpoch(job.finishedOn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Delay</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{job.delay ? `${Math.round(job.delay / 1000)}s` : '0s'}</span>
                </div>
              </div>
            </div>

            {/* Result */}
            {job.result && (
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg shadow-sm">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-3">Delivery Result</h2>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase">Message ID</p>
                    <code className="text-[11px] font-mono text-emerald-900 dark:text-emerald-200 break-all">{job.result.messageId}</code>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase">Sent At</p>
                    <p className="font-mono text-[11px] text-emerald-900 dark:text-emerald-200">{formatDate(job.result.sentAt)}</p>
                  </div>
                  {job.result.previewUrl && (
                    <a
                      href={job.result.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Preview
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Failure */}
            {job.failedReason && (
              <div className="p-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg shadow-sm">
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-400 mb-2">Failure Reason</h2>
                <p className="text-xs font-mono text-rose-700 dark:text-rose-300 whitespace-pre-wrap">{job.failedReason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
