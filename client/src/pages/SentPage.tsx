import React, { useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Header } from '../components/Header';
import { EmailTable } from '../components/EmailTable';
import { LoadingState, ErrorMessage } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { fetchSentEmails } from '../services/api';

export const SentPage: React.FC = () => {
  const fetchFn = useCallback(() => fetchSentEmails(), []);
  const { data, loading, error, refetch } = useFetch(fetchFn, 30_000);

  return (
    <div>
      <Header
        title="Sent Emails"
        subtitle="Emails successfully processed and dispatched by the SMTP worker."
        onRefresh={refetch}
        refreshing={loading && !!data}
        actions={
          data && (
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              {data.length} sent
            </span>
          )
        }
      />

      {loading && !data && <LoadingState message="Loading sent emails…" />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && (
        <>
          <div className="mb-4 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100/70 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-md px-4 py-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Click the external link icon (↗) next to any row to open the delivery preview.</span>
          </div>

          <EmailTable
            jobs={data}
            emptyTitle="No sent emails yet"
            emptyDescription="Sent emails appear here once a scheduled job is processed by the worker."
          />
        </>
      )}
    </div>
  );
};
