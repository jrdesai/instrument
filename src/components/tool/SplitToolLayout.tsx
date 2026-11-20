import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface SplitToolLayoutProps {
  /** Content for the left (desktop) / top (mobile) pane. */
  left: ReactNode;
  /** Content for the right (desktop) / bottom (mobile) pane. */
  right: ReactNode;
  /** Initial percentage width of the left pane on desktop (default: 50). */
  defaultLeftPercent?: number;
  /** Minimum left pane percentage (default: 20). */
  minPercent?: number;
  /** Maximum left pane percentage (default: 80). */
  maxPercent?: number;
  /** Optional className for the outer split container. */
  className?: string;
}

/**
 * Responsive two-pane split layout with an accessible draggable divider on desktop (`md+`)
 * and vertical stacking on narrow viewports. Double-click or press `0` on the separator to
 * reset to `defaultLeftPercent`.
 */
export function SplitToolLayout({
  left,
  right,
  defaultLeftPercent = 50,
  minPercent = 20,
  maxPercent = 80,
  className,
}: SplitToolLayoutProps) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const clamp = useCallback(
    (value: number) => Math.min(maxPercent, Math.max(minPercent, value)),
    [minPercent, maxPercent]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(clamp(pct));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, clamp]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setLeftPercent((prev) => clamp(prev - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setLeftPercent((prev) => clamp(prev + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setLeftPercent(minPercent);
    } else if (e.key === "End") {
      e.preventDefault();
      setLeftPercent(maxPercent);
    } else if (e.key === "Enter" || e.key === "0") {
      e.preventDefault();
      setLeftPercent(defaultLeftPercent);
    }
  };

  const leftStyle = { "--split-left": `${leftPercent}%` } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={twMerge("flex min-h-0 flex-1 flex-col md:flex-row", className)}
    >
      <div
        style={leftStyle}
        className="flex min-h-[180px] min-w-0 flex-1 flex-col border-b border-border-light dark:border-border-dark md:min-h-0 md:flex-none md:shrink-0 md:w-[var(--split-left)] md:border-b-0"
      >
        {left}
      </div>

      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Resize panels"
        aria-valuenow={Math.round(leftPercent)}
        aria-valuemin={minPercent}
        aria-valuemax={maxPercent}
        title="Drag to resize · Double-click to reset"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDoubleClick={() => setLeftPercent(defaultLeftPercent)}
        onKeyDown={handleKeyDown}
        className={twMerge(
          "hidden md:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-border-light/70 transition-colors hover:bg-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:bg-border-dark",
          isDragging && "bg-primary/60 dark:bg-primary/60"
        )}
      >
        <span className="h-6 w-0.5 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
      </div>

      <div className="flex min-h-[180px] min-w-0 flex-1 flex-col md:min-h-0">
        {right}
      </div>
    </div>
  );
}
