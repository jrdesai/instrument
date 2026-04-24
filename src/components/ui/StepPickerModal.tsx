import { useEffect, useMemo, useRef, useState } from "react";
import { isWeb } from "../../bridge";
import { scoreMatch } from "../../lib/toolSearch";
import { tools } from "../../registry";
import { useToolStore } from "../../store";
import type { Tool } from "../../registry";

export interface StepPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tool: Tool) => void;
  /** Tool IDs already in the chain — shown with a checkmark but still selectable. */
  existingToolIds?: string[];
}

export function StepPickerModal({
  isOpen,
  onClose,
  onSelect,
  existingToolIds = [],
}: StepPickerModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listItemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const recentToolIds = useToolStore((s) => s.recentToolIds);
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);

  const platformTools = useMemo(
    () => tools.filter((tool) => !isWeb || tool.platforms.includes("web")),
    []
  );

  const chainableImplemented = useMemo(
    () =>
      platformTools.filter(
        (t) => t.implemented && t.chainable === true
      ),
    [platformTools]
  );

  const results = useMemo<Tool[]>(() => {
    if (query.trim()) {
      return chainableImplemented
        .map((t) => ({ tool: t, score: scoreMatch(t, query) }))
        .filter(({ score }) => score > 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ tool }) => tool);
    }

    return [
      ...recentToolIds
        .slice(0, 5)
        .map((id) => chainableImplemented.find((t) => t.id === id))
        .filter((t): t is Tool => !!t),
      ...favouriteToolIds
        .filter((id) => !recentToolIds.slice(0, 5).includes(id))
        .slice(0, 3)
        .map((id) => chainableImplemented.find((t) => t.id === id))
        .filter((t): t is Tool => !!t),
    ];
  }, [query, recentToolIds, favouriteToolIds, chainableImplemented]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  useEffect(() => {
    listItemRefs.current.length = results.length;
  }, [results]);

  useEffect(() => {
    listItemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onClose]);

  function pickTool(tool: Tool) {
    onSelect(tool);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      pickTool(results[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }

  if (!isOpen) return null;

  const sectionLabel = query.trim()
    ? results.length > 0
      ? `${results.length} result${results.length === 1 ? "" : "s"}`
      : null
    : results.length > 0
      ? "Recent & Favourites"
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none"
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg mx-4 bg-panel-light dark:bg-panel-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal
        aria-label="Add chain step"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-border-dark">
          <span
            className="material-symbols-outlined text-[20px] text-slate-400 shrink-0"
            aria-hidden
          >
            conversion_path
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chainable tools…"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            aria-label="Search chainable tools"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Clear search"
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {sectionLabel && (
            <p className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {sectionLabel}
            </p>
          )}

          {results.length > 0 ? (
            <ul role="listbox" className="pb-2">
              {results.map((tool, i) => {
                const isSelected = i === selectedIndex;
                const isFavourite = favouriteToolIds.includes(tool.id);
                const inChainCount = existingToolIds.filter((id) => id === tool.id).length;
                return (
                  <li
                    key={tool.id}
                    ref={(el) => {
                      listItemRefs.current[i] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickTool(tool);
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isSelected
                          ? "text-primary"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                      aria-hidden
                    >
                      {tool.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{tool.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {inChainCount > 0 && (
                        <span
                          className="rounded px-1 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
                          title={inChainCount > 0 ? `In this chain ${inChainCount}×` : undefined}
                        >
                          +{inChainCount}
                        </span>
                      )}
                      {isFavourite && (
                        <span
                          className="material-symbols-outlined text-[14px] text-amber-400"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          aria-label="Favourite"
                        >
                          star
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {tool.displayCategory}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : query.trim() ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
              <p className="text-sm">
                No chainable tools for &quot;
                <span className="font-medium">{query}</span>&quot;
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-[32px]">manage_search</span>
              <p className="text-sm">Start typing to search chainable tools</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-border-dark">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">↑↓</kbd> navigate
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">↵</kbd> add
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
