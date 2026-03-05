import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  toolName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("[error-boundary] component crashed:", error.message);
      console.error("[error-boundary] stack:", info.componentStack);
    }
    this.setState({ errorInfo: info.componentStack ?? null });
  }

  handleTryAgain = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { error, errorInfo, showDetails } = this.state;
      const heading = this.props.toolName
        ? `${this.props.toolName} encountered an unexpected error`
        : "Something went wrong";

      return (
        <div className="bg-panel-dark border border-red-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span
              className="material-symbols-outlined text-red-400 shrink-0"
              aria-hidden
            >
              error_outline
            </span>
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-red-400 font-medium">{heading}</h2>
              <p className="text-slate-400 text-sm">
                This tool crashed unexpectedly. Your other tools are unaffected.
              </p>
              {import.meta.env.DEV && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      this.setState((s) => ({ showDetails: !s.showDetails }))
                    }
                    className="text-slate-500 text-xs hover:text-slate-400 transition-colors"
                  >
                    {showDetails ? "Hide details" : "Show details"}
                  </button>
                  {showDetails && errorInfo && (
                    <pre className="text-slate-500 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto mt-2 p-2 bg-background-dark rounded">
                      {error.message}
                      {"\n\n"}
                      {errorInfo}
                    </pre>
                  )}
                </>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={this.handleTryAgain}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
