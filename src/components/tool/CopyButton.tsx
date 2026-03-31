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
  /** Visual variant. "primary" = filled blue. "outline" = bordered ghost. "icon" = large copy glyph. Default: "outline" */
  variant?: "primary" | "outline" | "icon";
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
  const [iconStatus, setIconStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  useEffect(() => {
    if (variant !== "icon") setDisplay(label);
  }, [label, variant]);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    if (variant === "icon") {
      try {
        await navigator.clipboard.writeText(value);
        setIconStatus("copied");
      } catch {
        setIconStatus("failed");
      }
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => {
        setIconStatus("idle");
        resetRef.current = null;
      }, COPIED_DURATION_MS);
      return;
    }
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
  }, [value, label, variant]);

  const base =
    "rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const textButtonBase = "px-3 py-1.5 text-xs font-medium";
  const styles =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary/90"
      : variant === "icon"
        ? "inline-flex h-10 w-10 shrink-0 items-center justify-center border border-border-light bg-panel-light text-slate-600 hover:bg-slate-100 hover:text-primary dark:border-border-dark dark:bg-panel-dark dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-primary"
        : "bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700";

  if (variant === "icon") {
    const glyph =
      iconStatus === "copied"
        ? "check"
        : iconStatus === "failed"
          ? "error"
          : "content_copy";
    const glyphClass =
      iconStatus === "copied"
        ? "text-[22px] text-emerald-500 dark:text-emerald-400"
        : iconStatus === "failed"
          ? "text-[22px] text-red-400"
          : "text-[22px]";

    return (
      <button
        type="button"
        onClick={handleCopy}
        disabled={!value}
        aria-label={ariaLabel ?? "Copy"}
        title="Copy"
        className={twMerge(base, styles, className)}
      >
        <span className={`material-symbols-outlined leading-none ${glyphClass}`}>{glyph}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      aria-label={ariaLabel}
      className={twMerge(base, textButtonBase, styles, className)}
    >
      {display}
    </button>
  );
}
