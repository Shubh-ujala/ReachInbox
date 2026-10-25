import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, clerkKeyConfigured, setClerkPublishableKey } = useAuth();
  const { theme } = useTheme();

  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey.startsWith('pk_')) {
      setKeyError('Publishable Key must start with "pk_test_" or "pk_live_" (from Clerk Dashboard)');
      return;
    }
    setKeyError(null);
    setClerkPublishableKey(cleanKey);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center px-4 font-sans transition-colors duration-150 relative">
      {/* Top bar controls */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-9 h-9 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-mono font-bold text-sm mx-auto flex items-center justify-center mb-3 shadow-sm">
            RI
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            ReachInbox Scheduler
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Sign in with Google OAuth via Clerk
          </p>
        </div>

        {clerkKeyConfigured ? (
          /* Clerk Native Sign In Card */
          <div className="flex justify-center">
            <SignIn
              appearance={{
                layout: {
                  socialButtonsVariant: 'blockButton',
                  logoPlacement: 'none',
                },
                variables: {
                  colorPrimary: theme === 'dark' ? '#f4f4f5' : '#18181b',
                  colorBackground: theme === 'dark' ? '#18181b' : '#ffffff',
                  colorText: theme === 'dark' ? '#f4f4f5' : '#18181b',
                  colorInputBackground: theme === 'dark' ? '#09090b' : '#ffffff',
                  colorInputText: theme === 'dark' ? '#f4f4f5' : '#18181b',
                  borderRadius: '0.5rem',
                },
                elements: {
                  card: 'border border-zinc-200 dark:border-zinc-800 shadow-md rounded-lg',
                  footerActionLink: 'text-zinc-900 dark:text-zinc-100 font-medium hover:underline',
                },
              }}
              routing="virtual"
              fallbackRedirectUrl="/dashboard"
            />
          </div>
        ) : (
          /* Clerk API Key Configuration Card if key is not yet set in .env */
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <KeyRound className="w-4 h-4 text-emerald-500" />
              <span>Connect Clerk for Google Auth</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Google OAuth is managed securely through Clerk. To activate login, paste your Clerk Publishable Key below or set <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">VITE_CLERK_PUBLISHABLE_KEY</code> in <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">client/.env</code>.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                  CLERK PUBLISHABLE KEY
                </label>
                <input
                  type="text"
                  placeholder="pk_test_..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="input font-mono"
                />
              </div>

              {keyError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{keyError}</p>
              )}

              <button
                type="submit"
                className="w-full btn-primary text-xs"
              >
                Save & Continue to Google Sign In
              </button>
            </form>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Google Social Login ready in Clerk Dashboard</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auto-synced with MongoDB Atlas database</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
