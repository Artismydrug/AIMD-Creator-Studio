import React, { Component, ComponentType, PropsWithChildren } from 'react';
import { ErrorFallback, ErrorFallbackProps } from '@/components/ErrorFallback';
import { reportException } from '@/lib/telemetry';
import { getErrorDiagnosticCode, type ErrorDiagnosticStage } from '@/lib/errorDiagnostics';

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
  diagnosticStage?: ErrorDiagnosticStage;
}>;

type ErrorBoundaryState = { error: Error | null; componentStack: string | null };

/**
 * This is a special case for for using the class components. Error boundaries must be class components because React only provides error boundary functionality through lifecycle methods (componentDidCatch and getDerivedStateFromError) which are not available in functional components.
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportException(error, 'render');
    this.setState({ componentStack: info.componentStack ?? null });
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info.componentStack ?? '');
    }
  }

  resetError = (): void => {
    this.setState({ error: null, componentStack: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
        diagnosticCode={getErrorDiagnosticCode(
          this.state.error,
          this.state.componentStack,
          this.props.diagnosticStage,
        )}
      />
    ) : (
      this.props.children
    );
  }
}
