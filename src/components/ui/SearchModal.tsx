import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isWeb } from "../../bridge";
import { scoreMatch } from "../../lib/toolSearch";
import { tools } from "../../registry";
import { usePreferenceStore, useToolStore } from "../../store";
import type { Tool } from "../../registry";

interface Command {
  id: string;
  name: string;
  description: string;
  icon: string;
  action: () => void;
  available?: boolean;
}

export function SearchModal({
  isOpen,
  onClose,
  onOpenShortcuts,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listItemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const recentToolIds = useToolStore((s) => s.recentToolIds);
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const addToRecent = useToolStore((s) => s.addToRecent);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const toggleFavourite = useToolStore((s) => s.toggleFavourite);
  const theme = usePreferenceStore((s) => s.theme);
  const setTheme = usePreferenceStore((s) => s.setTheme);

  const platformTools = useMemo(
    () => tools.filter((tool) => !isWeb || tool.platforms.includes("web")),
    []
  );

  const allImplemented = useMemo(
    () => platformTools.filter((t) => t.implemented),
    [platformTools]
  );

  const toolResults = useMemo<Tool[]>(() => {
    if (query.trim()) {
      return allImplemented
        .map((t) => ({ tool: t, score: scoreMatch(t, query) }))
        .filter(({ score }) => score > 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ tool }) => tool);
    }

    return [
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
  }, [query, recentToolIds, favouriteToolIds, allImplemented]);

  const toolPageMatch = location.pathname.match(/^\/tools\/(.+)$/);
  const currentToolId = toolPageMatch?.[1] ?? null;
  const currentTool = currentToolId
    ? allImplemented.find((t) => t.id === currentToolId) ?? null
    : null;
  const currentIsFavourite = currentToolId
    ? favouriteToolIds.includes(currentToolId)
    : false;

  const commands: Command[] = useMemo(
    () => [
      {
        id: "toggle-theme",
        name: "Toggle theme",
        description:
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: theme === "dark" ? "light_mode" : "dark_mode",
        action: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        id: "keyboard-shortcuts",
        name: "Keyboard shortcuts",
        description: "View all keyboard shortcuts",
        icon: "keyboard",
        action: () => {
          onOpenShortcuts();
          onClose();
        },
      },
      {
        id: "go-history",
        name: "History",
        description: "View tool usage history",
        icon: "history",
        action: () => {
          navigate("/history");
          onClose();
        },
      },
      {
        id: "go-chains",
        name: "Chains",
        description: "View and edit tool chains",
        icon: "conversion_path",
        action: () => {
          navigate("/chains");
          onClose();
        },
      },
      {
        id: "go-settings",
        name: "Settings",
        description: "Open app settings",
        icon: "settings",
        action: () => {
          navigate("/settings");
          onClose();
        },
      },
      {
        id: "toggle-favourite",
        name: currentIsFavourite
          ? `Unfavourite ${currentTool?.name ?? ""}`
          : `Favourite ${currentTool?.name ?? ""}`,
        description: currentIsFavourite
          ? "Remove from favourites"
          : "Add to favourites",
        icon: currentIsFavourite ? "star_off" : "star",
        action: () => {
          if (currentTool) toggleFavourite(currentTool);
          onClose();
        },
        available: currentTool != null,
      },
    ],
    [
      currentIsFavourite,
      currentTool,
      navigate,
      onClose,
      onOpenShortcuts,
      setTheme,
      theme,
      toggleFavourite,
    ]
  );

  const visibleCommands = useMemo(
    () => commands.filter((c) => c.available !== false),
    [commands]
  );
  const q = query.trim().toLowerCase();
  const filteredCommands = useMemo(() => {
    if (!q) return visibleCommands;
    return visibleCommands.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [q, visibleCommands]);
  const totalItems = useMemo(
    () => [...toolResults, ...filteredCommands],
    [toolResults, filteredCommands]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [toolResults.length, filteredCommands.length, query]);

  useEffect(() => {
    listItemRefs.current.length = totalItems.length;
  }, [totalItems.length]);

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

  function openTool(tool: Tool) {
    setActiveTool(tool);
    addToRecent(tool);
    navigate(`/tools/${tool.id}`);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const max = totalItems.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, Math.min(i + 1, max)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && totalItems[selectedIndex]) {
      e.preventDefault();
      const item = totalItems[selectedIndex];
      if ("action" in item) {
        item.action();
      } else {
        openTool(item);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }

  if (!isOpen) return null;

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
            placeholder="Search tools and commands…"
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
          {(toolResults.length > 0 || filteredCommands.length > 0) ? (
            <ul role="listbox" className="pb-2">
              {!q && toolResults.length > 0 && (
                <li className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Recent & Favourites
                </li>
              )}
              {q && toolResults.length > 0 && (
                <li className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {toolResults.length} result{toolResults.length === 1 ? "" : "s"}
                </li>
              )}
              {toolResults.map((tool, i) => {
                const isSelected = i === selectedIndex;
                const isFavourite = favouriteToolIds.includes(tool.id);
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
              {filteredCommands.length > 0 && (
                <li className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Commands
                </li>
              )}
              {filteredCommands.map((cmd, i) => {
                const absIndex = toolResults.length + i;
                const isSelected = absIndex === selectedIndex;
                return (
                  <li
                    key={cmd.id}
                    ref={(el) => {
                      listItemRefs.current[absIndex] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setSelectedIndex(absIndex)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      cmd.action();
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
                      {cmd.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {cmd.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate block">
                        {cmd.description}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Command
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
                No results found for "
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
