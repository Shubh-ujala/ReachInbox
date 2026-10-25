import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/schedule',  label: 'Schedule Email',  icon: Send },
  { to: '/scheduled', label: 'Scheduled',       icon: Clock },
  { to: '/sent',      label: 'Sent',            icon: CheckCircle2 },
  { to: '/failed',    label: 'Failed',          icon: XCircle },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-30 font-sans transition-colors duration-150">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-mono font-bold text-xs flex items-center justify-center shadow-sm">
            RI
          </div>
          <div>
            <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 leading-none">ReachInbox</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">Scheduler</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => navigate('/')}
            title="Landing Page"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-0.5 transition-colors p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <span className="text-[11px]">Site</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Navigation
        </div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(`${to}/`);

          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                active
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1 flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-1.5 px-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-medium transition-colors shadow-sm"
          >
            Sign In with Google
          </button>
        )}
      </div>
    </aside>
  );
};
