import React from 'react';
import { Header } from '../components/Header';
import { EmailForm } from '../components/EmailForm';

export const SchedulePage: React.FC = () => (
  <div>
    <Header
      title="Schedule an Email"
      subtitle="Compose your email, attach files, and pick a future date and time to send it."
    />
    <EmailForm />
  </div>
);
