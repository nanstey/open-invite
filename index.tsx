import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { AppRouterProvider } from './router';

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
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
