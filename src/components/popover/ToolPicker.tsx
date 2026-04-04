import { useEffect, useRef, useState } from "react";
import { getPopoverTools } from "../../registry";
import type { Tool } from "../../registry";

interface ToolPickerProps {
  onSelect: (toolId: string) => void;
  onClose: () => void;
}

const ALL_TOOLS = getPopoverTools();

export function ToolPicker({ onSelect, onClose }: ToolPickerProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered: Tool[] = query.trim()
    ? ALL_TOOLS.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      )
    : ALL_TOOLS;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) onSelect(filtered[activeIndex].id);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark">
      <div
        data-tauri-drag-region
        className="flex shrink-0 items-center gap-2 border-b border-border-light bg-panel-light px-3 py-2.5 dark:border-border-dark dark:bg-panel-dark"
      >
        <span className="material-symbols-outlined shrink-0 text-[18px] text-slate-400">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search tools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="flex shrink-0 items-center rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800 dark:hover:text-red-400"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>

      <ul ref={listRef} className="custom-scrollbar flex-1 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">
            No tools match &quot;{query}&quot;
          </li>
        )}
        {filtered.map((tool, i) => (
          <li key={tool.id}>
            <button
              type="button"
              onClick={() => onSelect(tool.id)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === activeIndex
                  ? "bg-primary/10 text-primary"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
              }`}
            >
              <span
                className={`material-symbols-outlined shrink-0 text-[16px] ${
                  i === activeIndex ? "text-primary" : "text-slate-400"
                }`}
              >
                {tool.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{tool.name}</p>
                <p className="truncate text-[10px] text-slate-400">{tool.displayCategory}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex shrink-0 items-center gap-3 border-t border-border-light bg-panel-light px-4 py-1.5 dark:border-border-dark dark:bg-panel-dark">
        <span className="text-[10px] text-slate-400">
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">↑↓</kbd>{" "}
          navigate
        </span>
        <span className="text-[10px] text-slate-400">
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">↵</kbd> open
        </span>
        <span className="text-[10px] text-slate-400">
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">esc</kbd> close
        </span>
      </div>
    </div>
  );
}
