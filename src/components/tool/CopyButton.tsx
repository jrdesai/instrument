import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

const COPIED_DURATION_MS = 1500;

interface CopyButtonProps {
  /** Text to copy. Button is disabled when undefined or empty string. */
  value: string | undefined;
  /** Label shown at rest. Default: "Copy" */
  label?: string;
  /** Visual variant. "primary" = filled blue. "outline" = bordered ghost. Default: "outline" */
  variant?: "primary" | "outline";
  className?: string;
  /** Passed to the button element for screen readers. */
  "aria-label"?: string;
}

export function CopyButton({
  value,
  label = "Copy",
  variant = "outline",
  className,
  "aria-label": ariaLabel,
}: CopyButtonProps) {
  const [display, setDisplay] = useState(label);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setDisplay("Copied!");
    } catch {
      setDisplay("Copy failed");
    }
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => {
      setDisplay(label);
      resetRef.current = null;
    }, COPIED_DURATION_MS);
  }, [value, label]);

  const base =
    "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary/90"
      : "bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700";

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      aria-label={ariaLabel}
      className={twMerge(base, styles, className)}
    >
      {display}
    </button>
  );
}
