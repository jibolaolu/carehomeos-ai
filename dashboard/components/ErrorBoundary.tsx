"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  handleReset = () => { this.setState({ error: null }); };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="errorBoundaryContainer">
        <div className="errorBoundaryCard">
          <p style={{ fontSize: 32, margin: 0 }}>⚠️</p>
          <h2 className="errorBoundaryTitle">Something went wrong</h2>
          <p className="errorBoundaryMessage">
            This section encountered an unexpected error. Your data is safe — try refreshing
            the page. If the problem persists, contact your system administrator.
          </p>
          {error.message && (
            <pre className="errorBoundaryCode">{error.message}</pre>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              className="btn primary"
              onClick={this.handleReset}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
