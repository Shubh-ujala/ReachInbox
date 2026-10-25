import React from 'react';
import type { JobStatus } from '../../types';
import { STATUS_LABELS } from '../../utils/dateUtils';

const STATUS_STYLES: Record<JobStatus, string> = {
  waiting:   'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  delayed:   'bg-sky-50 text-sky-850 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  active:    'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60',
  completed: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  failed:    'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  cancelled: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700',
  unknown:   'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700',
};

const STATUS_DOTS: Record<JobStatus, string> = {
  waiting:   'bg-amber-500 dark:bg-amber-400',
  delayed:   'bg-sky-500 dark:bg-sky-400',
  active:    'bg-violet-500 dark:bg-violet-400 animate-pulse',
  completed: 'bg-emerald-500 dark:bg-emerald-400',
  failed:    'bg-rose-500 dark:bg-rose-400',
  cancelled: 'bg-zinc-400 dark:bg-zinc-500',
  unknown:   'bg-zinc-400 dark:bg-zinc-500',
};

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const base = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded border ${base} ${
        STATUS_STYLES[status] || STATUS_STYLES.unknown
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
};
