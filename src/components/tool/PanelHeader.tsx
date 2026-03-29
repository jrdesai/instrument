import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface PanelHeaderBadge {
  text: string;
  variant: "success" | "error" | "info";
}

interface PanelHeaderProps {
  /** Panel label — shown uppercase with tracking. Omit or pass "" to skip (use children only). */
  label?: string;
  /** Right-side metadata string — char counts, line counts, etc. */
  meta?: string;
  /** Validation badge — shown as coloured pill next to the label. */
  badge?: PanelHeaderBadge;
  /** When true, shows a "Processing…" indicator on the right. */
  processing?: boolean;
  /** Render `children` before the label (e.g. format select before "Input"). */
  prependChildren?: boolean;
  /** Any extra content beside the label (or after label when prependChildren is false). */
  children?: ReactNode;
  /** Renders after the badge on the left cluster (e.g. processing hint next to validity). */
  suffix?: ReactNode;
  className?: string;
}

export function PanelHeader({
  label = "",
  meta,
  badge,
  processing,
  prependChildren,
  children,
  suffix,
  className,
}: PanelHeaderProps) {
  const showLabel = label.trim().length > 0;

  return (
    <div
      className={twMerge(
        "flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {prependChildren ? children : null}
        {showLabel && (
          <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            {label}
          </span>
        )}
        {badge && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              badge.variant === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : badge.variant === "error"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-primary/10 text-primary"
            }`}
          >
            {badge.text}
          </span>
        )}
        {suffix}
        {!prependChildren ? children : null}
      </div>
      <div className="flex items-center gap-2">
        {processing && (
          <span className="text-xs text-primary">Processing…</span>
        )}
        {meta && (
          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}
