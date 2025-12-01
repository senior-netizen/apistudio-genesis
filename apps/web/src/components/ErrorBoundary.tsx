import React from 'react';
import { ErrorState } from './system/ErrorState';

type ErrorBoundaryProps = {
  fallback?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
};

type ErrorBoundaryState = { hasError: boolean; error?: unknown; recovering?: boolean };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  handleRetry = async () => {
    if (this.state.recovering) return;
    this.setState({ recovering: true });
    try {
      await this.props.onRetry?.();
      this.setState({ hasError: false, error: undefined, recovering: false });
    } catch (error) {
      this.setState({ error, recovering: false });
    }
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorState
          title="We hit a snag"
          description="This view failed to load. We've logged the issue, and you can retry instantly."
          onRetry={this.props.onRetry ? this.handleRetry : undefined}
          busy={this.state.recovering}
        />
      );
    }
    return this.props.children;
  }
}

