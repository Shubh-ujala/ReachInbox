import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export const AppLayout: React.FC = () => (
  <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-150">
    <Sidebar />
    <main className="flex-1 overflow-y-auto ml-64 bg-zinc-50 dark:bg-zinc-950 min-h-screen text-zinc-900 dark:text-zinc-100 transition-colors duration-150">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <Outlet />
      </div>
    </main>
  </div>
);
