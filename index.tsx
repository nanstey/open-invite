import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './domains/auth/AuthProvider';
import { AppRouterProvider } from './router';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

function Root() {
  const auth = useAuth();
  return <AppRouterProvider auth={auth} />;
}

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Root />
      </AuthProvider>
      {import.meta.env.VITE_SHOW_DEVTOOLS === 'true' || (import.meta.env.VITE_SHOW_DEVTOOLS === undefined && import.meta.env.DEV) ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  </React.StrictMode>
);
