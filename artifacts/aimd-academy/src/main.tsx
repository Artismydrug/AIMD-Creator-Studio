import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { reportException, startTelemetry } from '@/lib/telemetry';

import './index.css';

startTelemetry();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    reportException(error, 'render');
    if (import.meta.env.DEV) console.error(error, errorInfo.componentStack);
  },
  onUncaughtError: (error) => reportException(error, 'render', false),
  onRecoverableError: (error) => reportException(error, 'render'),
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
