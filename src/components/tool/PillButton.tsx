import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface PillButtonProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** "filled" = no border when inactive. "outlined" = border always visible. Default: "filled" */
  variant?: "filled" | "outlined";
  /** "sm" = text-xs px-2 py-1. "md" = text-sm px-3 py-1. Default: "md" */
  size?: "sm" | "md";
  /** "lg" = rounded-lg. "full" = rounded-full. Default: "lg" */
  shape?: "lg" | "full";
  className?: string;
  "aria-label"?: string;
}

export function PillButton({
  active,
  onClick,
  disabled,
  children,
  variant = "filled",
  size = "md",
  shape = "lg",
  className,
  "aria-label": ariaLabel,
}: PillButtonProps) {
  const sizeClass =
    size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm";
  const shapeClass = shape === "full" ? "rounded-full" : "rounded-lg";

  const activeClass = "bg-primary text-white";
  const inactiveClass =
    variant === "outlined"
      ? "border border-border-light dark:border-border-dark text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={twMerge(
        "font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        sizeClass,
        shapeClass,
        active ? activeClass : inactiveClass,
        className
      )}
    >
      {children}
    </button>
  );
}
