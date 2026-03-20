import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isWeb } from "../../bridge";
import { tools } from "../../registry";
import { useToolStore } from "../../store";
import type { Tool } from "../../registry";

function scoreMatch(tool: Tool, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const name = tool.name.toLowerCase();
  const desc = tool.description.toLowerCase();
  const cat = tool.displayCategory.toLowerCase();
  let score = 0;
  if (name === q) score += 10;
  else if (name.startsWith(q)) score += 8;
  else if (name.includes(q)) score += 6;
  if (tool.keywords.some((k) => k === q)) score += 5;
  else if (tool.keywords.some((k) => k.startsWith(q))) score += 3;
  else if (tool.keywords.some((k) => k.includes(q))) score += 1;
  if (desc.includes(q)) score += 2;
  if (cat.includes(q)) score += 1;
  return score;
}

export function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const recentToolIds = useToolStore((s) => s.recentToolIds);
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const addToRecent = useToolStore((s) => s.addToRecent);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  const platformTools = useMemo(
    () => tools.filter((tool) => !isWeb || tool.platforms.includes("web")),
    []
  );

  const allImplemented = platformTools.filter((t) => t.implemented);

  const results: Tool[] = query.trim()
    ? allImplemented
        .map((t) => ({ tool: t, score: scoreMatch(t, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ tool }) => tool)
    : [
        ...recentToolIds
          .slice(0, 5)
          .map((id) => allImplemented.find((t) => t.id === id))
          .filter((t): t is Tool => !!t),
        ...favouriteToolIds
          .filter((id) => !recentToolIds.slice(0, 5).includes(id))
          .slice(0, 3)
          .map((id) => allImplemented.find((t) => t.id === id))
          .filter((t): t is Tool => !!t),
      ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
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

  function openTool(tool: Tool) {
    setActiveTool(tool);
    addToRecent(tool);
    navigate(`/tools/${tool.id}`);
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
      openTool(results[selectedIndex]);
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg mx-4 bg-panel-light dark:bg-panel-dark rounded-xl shadow-2xl border border-slate-200 dark:border-border-dark overflow-hidden"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal
        aria-label="Search tools"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-border-dark">
          <span
            className="material-symbols-outlined text-[20px] text-slate-400 shrink-0"
            aria-hidden
          >
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            aria-label="Search tools"
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
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
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
                return (
                  <li
                    key={tool.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      openTool(tool);
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
                      <span className="text-sm font-medium truncate block">
                        {tool.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
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
              <span className="material-symbols-outlined text-[32px]">
                search_off
              </span>
              <p className="text-sm">
                No tools found for "
                <span className="font-medium">{query}</span>"
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined text-[32px]">
                manage_search
              </span>
              <p className="text-sm">Start typing to search tools</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-border-dark">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
              ↵
            </kbd>{" "}
            open
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
