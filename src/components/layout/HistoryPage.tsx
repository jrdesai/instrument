import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToolById } from "../../registry";
import { useHistoryStore } from "../../store";

function formatTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
}

function summarise(value: unknown, maxLen = 80): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    return value.length > maxLen ? value.slice(0, maxLen) + "…" : value;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
  } catch {
    return String(value);
  }
}

type HistoryRow = {
  toolId: string;
  input: unknown;
  output: unknown;
  timestamp: number;
};

export function HistoryPage() {
  const navigate = useNavigate();
  const history = useHistoryStore((s) => s.history);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterToolId, setFilterToolId] = useState<string | null>(null);

  const allEntries = useMemo(() => {
    return Object.entries(history)
      .flatMap(([toolId, entries]) =>
        entries.map((entry) => ({ toolId, ...entry }))
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  const toolsInHistory = useMemo(() => {
    const ids = [...new Set(allEntries.map((e) => e.toolId))];
    return ids
      .map((id) => getToolById(id))
      .filter((t): t is NonNullable<typeof t> => t != null);
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows: HistoryRow[] = allEntries;
    if (filterToolId) {
      rows = rows.filter((e) => e.toolId === filterToolId);
    }
    if (q) {
      rows = rows.filter((e) => {
        const tool = getToolById(e.toolId);
        const name = (tool?.name ?? e.toolId).toLowerCase();
        const sin = summarise(e.input).toLowerCase();
        const sout = summarise(e.output).toLowerCase();
        return name.includes(q) || sin.includes(q) || sout.includes(q);
      });
    }
    return rows;
  }, [allEntries, filterToolId, searchQuery]);

  const queryTrimmed = searchQuery.trim();
  const hasActiveFilters = queryTrimmed.length > 0 || filterToolId != null;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterToolId(null);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="shrink-0 px-8 py-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            History
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Persisted locally · max 20 entries per tool · never leaves your device
          </p>
        </div>
        {allEntries.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </header>

      {allEntries.length > 0 && (
        <div className="shrink-0 space-y-2 border-b border-border-light bg-background-light px-8 py-3 dark:border-border-dark dark:bg-background-dark">
          <div className="flex max-w-xl items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <span
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history…"
                className="h-8 w-full rounded-lg border border-transparent bg-slate-100 py-1 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-primary/40 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-primary/40"
                aria-label="Search history"
              />
            </div>
            {queryTrimmed.length > 0 && (
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {filteredEntries.length} result{filteredEntries.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {toolsInHistory.length >= 2 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterToolId(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterToolId === null
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}
              >
                All
              </button>
              {toolsInHistory.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setFilterToolId(tool.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterToolId === tool.id
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {tool.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {allEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <span className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600" aria-hidden>
              history
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No history yet. Run a tool to see results here.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 rounded-lg border border-border-light px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-border-dark dark:text-slate-400 dark:hover:border-primary/40 dark:hover:text-primary"
            >
              Browse tools
              <span className="material-symbols-outlined text-[14px]" aria-hidden>
                arrow_forward
              </span>
            </button>
          </div>
        ) : filteredEntries.length === 0 && hasActiveFilters ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No history matches your search.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-border-light px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-border-dark dark:text-slate-400 dark:hover:border-primary/40 dark:hover:text-primary"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="px-8 py-6 space-y-2">
            {filteredEntries.map((entry) => {
              const tool = getToolById(entry.toolId);

              if (!tool) {
                return (
                  <div
                    key={`${entry.toolId}-${entry.timestamp}`}
                    title="Tool no longer available"
                    className="flex items-start gap-4 p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-panel-light/80 dark:bg-panel-dark/80"
                  >
                    <div className="size-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden>
                        build
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                        Tool no longer available
                      </p>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-sm font-mono text-slate-400 dark:text-slate-500 truncate">
                          {entry.toolId}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        <span className="text-slate-400 dark:text-slate-500">in </span>
                        {summarise(entry.input)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        <span className="text-slate-400 dark:text-slate-500">out </span>
                        {summarise(entry.output)}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`${entry.toolId}-${entry.timestamp}`}
                  className="group relative flex items-start gap-4 p-4 rounded-lg border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark transition-colors hover:border-primary/40"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/tools/${tool.id}`)}
                    aria-label={`Open ${tool.name}`}
                    className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  {/* Tool icon */}
                  <div className="size-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors mt-0.5">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden>
                      {tool.icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {tool.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                      <span className="text-slate-400 dark:text-slate-500">in  </span>
                      {summarise(entry.input)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                      <span className="text-slate-400 dark:text-slate-500">out </span>
                      {summarise(entry.output)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-600 group-hover:text-primary transition-colors shrink-0 mt-1" aria-hidden>
                    arrow_forward
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
