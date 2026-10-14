import React, { type PropsWithChildren } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorFallback, type ErrorFallbackProps } from '@/components/ErrorFallback';
import type { ErrorDiagnosticStage } from '@/lib/errorDiagnostics';

function ScreenRecovery(props: ErrorFallbackProps) {
  return <ErrorFallback {...props} recoverLocally />;
}

const stages: Record<string, ErrorDiagnosticStage> = {
  index: 'DASHBOARD',
  community: 'FEED',
  feed: 'FEED',
  workshops: 'WORKSHOPS',
  habits: 'HABITS',
  challenges: 'HABITS',
  'challenge-habits': 'HABITS',
  'learning-portfolio': 'PORTFOLIO',
};

/** Leave navigation available while a failing screen shows a content-free retry state. */
export default function ScreenErrorBoundary({ routeName, children }: PropsWithChildren<{ routeName: string }>) {
  return (
    <ErrorBoundary diagnosticStage={stages[routeName] ?? 'NAVIGATION'} FallbackComponent={ScreenRecovery}>
      {children}
    </ErrorBoundary>
  );
}
