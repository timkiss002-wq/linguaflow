import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { envIssues } from '@/lib/supabase';
import SetupRequiredPage from '@/pages/SetupRequiredPage';
import { Providers } from './app/providers';
import { router } from './app/router';
import './index.css';

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    {envIssues.length > 0 ? (
      <SetupRequiredPage issues={envIssues} />
    ) : (
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    )}
  </StrictMode>,
);
