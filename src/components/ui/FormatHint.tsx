import { useCallback, useEffect, useRef, useState } from "react";

export interface FormatHintProps {
  formats: Array<{
    label: string;
    example: string;
  }>;
  onSelect?: (example: string) => void;
}

export function FormatHint({ formats, onSelect }: FormatHintProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePopover = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closePopover();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closePopover]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePopover]);

  const handleSelect = useCallback(
    (example: string) => {
      onSelect?.(example);
      closePopover();
    },
    [onSelect, closePopover]
  );

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={togglePopover}
        aria-label="Show supported formats"
        aria-expanded={isOpen}
        className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-base leading-none p-0 border-0 bg-transparent"
      >
        <span className="material-symbols-outlined text-base leading-none">
          info
        </span>
      </button>
      {isOpen && (
        <div
          role="tooltip"
          className="absolute top-full right-0 mt-2 min-w-[280px] w-[280px] z-50 bg-panel-dark border border-border-dark rounded-lg shadow-lg p-3"
        >
          <div className="text-slate-300 text-xs font-medium mb-2 pb-2 border-b border-border-dark">
            Supported formats
          </div>
          <div className="flex flex-col">
            {formats.map(({ label, example }) => (
              <div
                key={example}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(example)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(example);
                  }
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded -mx-1 hover:bg-white/5 cursor-pointer transition-colors"
              >
                <span className="text-slate-500 text-xs w-28 flex-shrink-0">
                  {label}
                </span>
                <span className="font-mono text-slate-300 text-xs truncate min-w-0">
                  {example}
                </span>
              </div>
            ))}
          </div>
          {onSelect && (
            <div className="text-slate-600 text-xs italic mt-2 pt-2 border-t border-border-dark">
              Click any example to use it
            </div>
          )}
        </div>
      )}
    </div>
  );
}
