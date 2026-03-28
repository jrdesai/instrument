import { useMemo } from "react";
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

export function HistoryPage() {
  const navigate = useNavigate();
  const history = useHistoryStore((s) => s.history);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  const allEntries = useMemo(() => {
    return Object.entries(history)
      .flatMap(([toolId, entries]) =>
        entries.map((entry) => ({ toolId, ...entry }))
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="shrink-0 px-8 py-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            History
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Session only — cleared when the app closes
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
          </div>
        ) : (
          <div className="px-8 py-6 space-y-2">
            {allEntries.map((entry, idx) => {
              const tool = getToolById(entry.toolId);

              if (!tool) {
                return (
                  <div
                    key={idx}
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
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/tools/${tool.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/tools/${tool.id}`);
                    }
                  }}
                  className="group flex items-start gap-4 p-4 rounded-lg border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark transition-colors hover:border-primary/40 cursor-pointer"
                >
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
