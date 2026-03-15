import { useState } from "react";

interface ConfirmButtonProps {
  /** Label shown in the default (idle) state */
  label: string;
  /** Label shown on the confirm button once the user clicks the idle button */
  confirmLabel?: string;
  /** Called when the user confirms the action */
  onConfirm: () => void;
  /** Extra Tailwind classes applied to the idle button */
  className?: string;
  /** Extra Tailwind classes applied to the confirm button */
  confirmClassName?: string;
}

/**
 * Two-step confirmation button that avoids `window.confirm`, which is
 * silently swallowed by Tauri's WebView.
 *
 * First click → switches to an inline "Cancel / Confirm" state.
 * Confirm → calls `onConfirm` and resets.
 * Cancel / blur → resets without calling anything.
 */
export function ConfirmButton({
  label,
  confirmLabel = "Confirm",
  onConfirm,
  className = "",
  confirmClassName = "",
}: ConfirmButtonProps) {
  const [pending, setPending] = useState(false);

  if (pending) {
    return (
      <div className="flex items-center gap-1.5 shrink-0 ml-4">
        <button
          type="button"
          onClick={() => setPending(false)}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => {
            setPending(false);
            onConfirm();
          }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors ${confirmClassName}`}
        >
          {confirmLabel}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPending(true)}
      className={`shrink-0 ml-4 ${className}`}
    >
      {label}
    </button>
  );
}
