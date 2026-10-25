import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic data-fetching hook with optional polling interval.
 * @param fetchFn  Async function that returns data — should be stable (useCallback or module-level).
 * @param pollMs   If set, refetch automatically every pollMs milliseconds.
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  pollMs?: number
): UseFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (isMounted.current) {
        setData(result);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    isMounted.current = true;
    fetch();
    return () => { isMounted.current = false; };
  }, [fetch]);

  // Polling
  useEffect(() => {
    if (!pollMs) return;
    const timer = setInterval(fetch, pollMs);
    return () => clearInterval(timer);
  }, [fetch, pollMs]);

  return { data, loading, error, refetch: fetch };
}
