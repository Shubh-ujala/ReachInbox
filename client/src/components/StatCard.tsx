import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  subtitle,
}) => {
  return (
    <div className="card p-4 transition-colors">
      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</span>
        <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
      {subtitle && <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">{subtitle}</p>}
    </div>
  );
};
