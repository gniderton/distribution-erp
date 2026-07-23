import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-rose-50 text-rose-900 border border-rose-200 rounded-lg">
          <h1 className="text-xl font-bold mb-4">CRASH LOG (Please screenshot this):</h1>
          <pre className="whitespace-pre-wrap">{this.state.error?.toString()}</pre>
          <pre className="whitespace-pre-wrap mt-4 text-xs">{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
