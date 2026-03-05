/**
 * Centered loading spinner with optional label.
 */

interface LoadingSpinnerProps {
  /** Shown below the spinner. Default: "Loading..." */
  label?: string;
}

export function LoadingSpinner({ label = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full min-h-[120px]">
      <div
        className="w-6 h-6 rounded-full border-2 border-border-dark border-t-primary animate-spin"
        aria-hidden
      />
      {label && (
        <span className="text-slate-500 text-xs mt-3">{label}</span>
      )}
    </div>
  );
}
