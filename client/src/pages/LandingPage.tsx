import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Copy,
  Clock,
  Database,
  Shield,
  Cpu,
  CornerDownRight,
  Activity,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'curl' | 'response' | 'queue'>('curl');

  const copyCurl = () => {
    navigator.clipboard.writeText(`curl -X POST http://localhost:3001/api/emails/schedule \\
  -H "Content-Type: application/json" \\
  -H "X-Idempotency-Key: job-sample-901" \\
  -d '{
    "to": "client@company.com",
    "subject": "System Status Update",
    "body": "Daily performance report.",
    "scheduledAt": "2026-11-01T09:00:00.000Z",
    "timezone": "UTC"
  }'`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-150">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-mono font-bold text-xs shadow-sm">
              RI
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">ReachInbox</span>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5">
              v1.0
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-600 dark:text-zinc-400">
            <a href="#architecture" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Architecture</a>
            <a href="#pipeline" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Queue Pipeline</a>
            <a href="#spec" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">API Spec</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Sign in with Google</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="pt-16 pb-16 px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          {/* Subtle tech tag */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>BullMQ • Redis • MongoDB Atlas • Clerk OAuth</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight mb-5">
            Deterministic email job scheduling for production workloads.
          </h1>

          <p className="text-zinc-600 dark:text-zinc-400 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Schedule transactional emails with exact future delays using Redis-backed sorted sets.
            Zero polling overhead, decoupled workers, strict idempotency, and MongoDB audit logs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              className="px-5 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Sign in with Google'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <a
              href="#spec"
              className="px-5 py-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
            >
              API Reference
            </a>
          </div>
        </div>

        {/* ── Minimal Code & State Machine Terminal ──────────────────── */}
        <div id="spec" className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 dark:bg-zinc-950 overflow-hidden shadow-md">
          {/* Terminal Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/70 px-4 py-2 text-xs">
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setActiveTab('curl')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'curl'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                POST /api/emails/schedule
              </button>
              <button
                onClick={() => setActiveTab('response')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'response'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                201 Response
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'queue'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Queue State Machine
              </button>
            </div>

            <button
              onClick={copyCurl}
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>

          {/* Terminal Body */}
          <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto text-zinc-300 bg-zinc-900/90">
            {activeTab === 'curl' && (
              <pre>
                <span className="text-zinc-500"># Send scheduled email with custom idempotency key</span>{'\n'}
                <span className="text-emerald-400">curl</span> -X POST http://localhost:3001/api/emails/schedule \{'\n'}
                {'  '}-H <span className="text-zinc-300">"Content-Type: application/json"</span> \{'\n'}
                {'  '}-H <span className="text-zinc-300">"X-Idempotency-Key: email-b829-410a"</span> \{'\n'}
                {'  '}-d <span className="text-amber-300">{`'{`}</span>{'\n'}
                {'    '}<span className="text-zinc-400">"to"</span>: <span className="text-emerald-300">"recipient@example.com"</span>,{'\n'}
                {'    '}<span className="text-zinc-400">"subject"</span>: <span className="text-emerald-300">"Deployment Notification"</span>,{'\n'}
                {'    '}<span className="text-zinc-400">"body"</span>: <span className="text-emerald-300">"All systems operational."</span>,{'\n'}
                {'    '}<span className="text-zinc-400">"scheduledAt"</span>: <span className="text-emerald-300">"2026-11-01T09:00:00.000Z"</span>,{'\n'}
                {'    '}<span className="text-zinc-400">"timezone"</span>: <span className="text-emerald-300">"America/New_York"</span>{'\n'}
                {'  '}<span className="text-amber-300">{`}'`}</span>
              </pre>
            )}

            {activeTab === 'response' && (
              <pre className="text-emerald-400">
                {`{
  "success": true,
  "data": {
    "jobId": "email-b829-410a",
    "scheduledAt": "2026-11-01T09:00:00.000Z",
    "delay": 604800000
  },
  "message": "Email scheduled successfully"
}`}
              </pre>
            )}

            {activeTab === 'queue' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">DELAYED</span>
                  <CornerDownRight className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-300">Stored in Redis sorted set with timestamp score. Zero CPU polling.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">ACTIVE</span>
                  <CornerDownRight className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-300">Due timer fires; BullMQ worker atomically claims job & dispatches SMTP.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">COMPLETED</span>
                  <CornerDownRight className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-300">Message-ID recorded; delivery state committed to MongoDB Atlas.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Architecture Pillars ───────────────────────────────────── */}
      <section id="architecture" className="py-16 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Core System Design</p>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Reliability by Architecture</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
              <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Redis Sorted Sets</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                BullMQ relies on Redis sorted sets indexed by timestamp. No sleep loops or database polling queries.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
              <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Process Isolation</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The Express API and BullMQ worker run in independent processes. SMTP latency never impacts API latency.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
              <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">MongoDB Atlas</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Permanent document persistence for job metadata, recipient logs, retry histories, and user sessions.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
              <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Idempotency Keys</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Passing an <code>X-Idempotency-Key</code> guarantees duplicate submissions return 409 without double-sending.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Queue Pipeline Summary ─────────────────────────────────── */}
      <section id="pipeline" className="py-16 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">Inspect Queued & Sent Deliveries</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xl">
                Monitor real-time job counts, inspect delivery headers, and cancel queued tasks directly from the dashboard.
              </p>
            </div>

            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-2 flex-shrink-0 transition-colors shadow-sm"
            >
              <span>{isAuthenticated ? 'Launch Dashboard' : 'Sign in with Google'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 px-6 text-xs text-zinc-500 dark:text-zinc-500 font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>ReachInbox Email Scheduler • Open Source Task Engine</div>
          <div>Node.js • Express • BullMQ • Redis • MongoDB Atlas • Clerk OAuth</div>
        </div>
      </footer>
    </div>
  );
};
