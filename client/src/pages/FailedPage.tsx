import React, { useCallback } from 'react';
import { XCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { EmailTable } from '../components/EmailTable';
import { LoadingState, ErrorMessage } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { fetchFailedEmails } from '../services/api';

export const FailedPage: React.FC = () => {
  const fetchFn = useCallback(() => fetchFailedEmails(), []);
  const { data, loading, error, refetch } = useFetch(fetchFn, 20_000);

  return (
    <div>
      <Header
        title="Failed Emails"
        subtitle="Jobs that exhausted all retry attempts. Error details are shown below."
        onRefresh={refetch}
        refreshing={loading && !!data}
        actions={
          data && data.length > 0 && (
            <span className="text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800/60 px-2.5 py-1 rounded-md">
              <XCircle className="w-3 h-3 inline mr-1" />
              {data.length} failed
            </span>
          )
        }
      />

      {loading && !data && <LoadingState message="Loading failed emails…" />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && (
        <EmailTable
          jobs={data}
          emptyTitle="No failed emails"
          emptyDescription="Failed jobs appear here when all retry attempts are exhausted."
        />
      )}
    </div>
  );
};
