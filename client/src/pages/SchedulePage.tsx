import React from 'react';
import { Send } from 'lucide-react';
import { Header } from '../components/Header';
import { EmailForm } from '../components/EmailForm';

export const SchedulePage: React.FC = () => (
  <div>
    <Header
      title="Schedule an Email"
      subtitle="Compose your email and pick a future date and time to send it."
      actions={
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Send className="w-3.5 h-3.5" />
          <span>Delivered via Ethereal SMTP</span>
        </div>
      }
    />
    <EmailForm />
  </div>
);
