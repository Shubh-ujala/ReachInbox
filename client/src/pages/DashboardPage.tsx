import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, Activity, CheckCircle2, XCircle, Send,
  ArrowRight,
} from 'lucide-react';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState, ErrorMessage } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { fetchStats, fetchScheduledEmails, fetchSentEmails } from '../services/api';
import { formatDate, relativeTime } from '../utils/dateUtils';
import type { EmailJob } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const statsFn = useCallback(() => fetchStats(), []);
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useFetch(statsFn, 30_000);

  const scheduledFn = useCallback(() => fetchScheduledEmails(), []);
  const { data: scheduled } = useFetch(scheduledFn, 30_000);

  const sentFn = useCallback(() => fetchSentEmails(), []);
  const { data: sent } = useFetch(sentFn, 30_000);

  const recentActivity: EmailJob[] = [
    ...(scheduled ?? []).slice(0, 3),
    ...(sent ?? []).slice(0, 3),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);

  if (statsLoading) return <LoadingState message="Loading telemetry…" />;
  if (statsError) return <ErrorMessage message={statsError} onRetry={refetchStats} />;

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Real-time queue metrics and telemetry"
        onRefresh={refetchStats}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Total Jobs"
          value={stats?.total ?? 0}
          icon={LayoutDashboard}
        />
        <StatCard
          label="Scheduled"
          value={stats?.delayed ?? 0}
          icon={Clock}
          subtitle="In delayed set"
        />
        <StatCard
          label="Processing"
          value={stats?.active ?? 0}
          icon={Activity}
          subtitle="Worker active"
        />
        <StatCard
          label="Sent"
          value={stats?.completed ?? 0}
          icon={CheckCircle2}
          subtitle="SMTP accepted"
        />
        <StatCard
          label="Failed"
          value={stats?.failed ?? 0}
          icon={XCircle}
          subtitle="Retries exhausted"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Schedule Email', to: '/schedule', desc: 'Enqueue a new delayed message', icon: Send },
          { label: 'View Scheduled', to: '/scheduled', desc: 'Inspect pending Redis jobs', icon: Clock },
          { label: 'Delivery Logs', to: '/sent', desc: 'Audit sent messages and preview URLs', icon: CheckCircle2 },
        ].map(({ label, to, desc, icon: Icon }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group flex items-start gap-3.5 shadow-sm"
          >
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                {label}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{desc}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 self-center transition-colors" />
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/90">
          <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-700 dark:text-zinc-300">Recent Activity</h2>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">Auto-refresh 30s</span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">No scheduled or sent jobs recorded yet.</p>
            <button className="btn-primary mt-3 text-xs" onClick={() => navigate('/schedule')}>
              Schedule your first email
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {recentActivity.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                onClick={() => navigate(`/emails/${job.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">{job.data.subject}</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{job.data.to}</p>
                </div>
                <StatusBadge status={job.status} size="sm" />
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {relativeTime(job.data.scheduledAt)}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unused imports suppressor */}
      {void formatDate}
    </div>
  );
};
