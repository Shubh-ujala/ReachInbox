import React from 'react';
import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  refreshing,
  actions,
}) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
      {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>}
    </div>

    <div className="flex items-center gap-2">
      {actions}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="btn-ghost text-xs"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      )}
    </div>
  </div>
);
