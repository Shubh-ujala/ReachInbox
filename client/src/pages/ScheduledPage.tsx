import React, { useCallback } from 'react';
import { Clock } from 'lucide-react';
import { Header } from '../components/Header';
import { EmailTable } from '../components/EmailTable';
import { LoadingState, ErrorMessage } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { fetchScheduledEmails } from '../services/api';

export const ScheduledPage: React.FC = () => {
  const fetchFn = useCallback(() => fetchScheduledEmails(), []);
  const { data, loading, error, refetch } = useFetch(fetchFn, 15_000);

  return (
    <div>
      <Header
        title="Scheduled Emails"
        subtitle="Emails waiting to be sent at their scheduled time. Auto-refreshes every 15 seconds."
        onRefresh={refetch}
        refreshing={loading && !!data}
        actions={
          data && (
            <span className="text-[11px] font-mono text-zinc-700 bg-zinc-100 border border-zinc-200 dark:text-zinc-300 dark:bg-zinc-800/80 dark:border-zinc-700 px-2.5 py-1 rounded-md">
              <Clock className="w-3 h-3 inline mr-1" />
              {data.length} pending
            </span>
          )
        }
      />

      {loading && !data && <LoadingState message="Loading scheduled emails…" />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && (
        <EmailTable
          jobs={data}
          showCancel
          onCancelled={refetch}
          emptyTitle="No scheduled emails"
          emptyDescription="Schedule an email and it will appear here while waiting to be sent."
        />
      )}
    </div>
  );
};
