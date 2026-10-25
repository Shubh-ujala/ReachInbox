import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
    <Loader2 className="w-5 h-5 animate-spin text-zinc-400 dark:text-zinc-500 mb-3" />
    <p>{message}</p>
  </div>
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-zinc-500 dark:text-zinc-400">
    {icon && <div className="mb-3 text-zinc-400 dark:text-zinc-600">{icon}</div>}
    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{title}</p>
    {description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 text-center max-w-sm">{description}</p>}
    {action}
  </div>
);

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg p-5 max-w-sm text-center">
      <p className="text-xs font-semibold text-rose-800 dark:text-rose-400 mb-1">Error</p>
      <p className="text-xs text-rose-700 dark:text-rose-300 mb-3 leading-relaxed">{message}</p>
      {onRetry && (
        <button className="btn-secondary text-xs" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  </div>
);
