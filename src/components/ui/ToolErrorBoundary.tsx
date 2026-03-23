import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  toolName?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches errors thrown by tool components and renders a contained error card
 * instead of crashing the whole app. The user can reset the boundary and try again.
 */
export class ToolErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console in dev — bridge already handles Rust errors,
    // so this only fires for unexpected React/JS errors
    if (import.meta.env.DEV) {
      console.error(
        `[ToolErrorBoundary] ${this.props.toolName ?? "tool"} crashed:`,
        error,
        info
      );
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-red-400">
            error
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {this.props.toolName
                ? `${this.props.toolName} encountered an error`
                : "This tool encountered an error"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {import.meta.env.DEV && this.state.error
                ? this.state.error.message
                : "Something went wrong. Your other tools are unaffected."}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
