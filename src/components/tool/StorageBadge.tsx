import type { Tool } from "../../registry";

/** Explains whether tool I/O is persisted (session history vs sensitive). */
export function StorageBadge({ tool }: { tool: Tool }) {
  if (tool.sensitive) {
    return (
      <span
        title="Input and output are never recorded — not in history, not in storage."
        className="inline-flex cursor-default select-none items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400"
      >
        <span className="material-symbols-outlined text-[11px]" aria-hidden>
          lock
        </span>
        Never stored
      </span>
    );
  }

  return (
    <span
      title="Runs: kept in memory for this session only. Last-typed input: saved to localStorage as a draft."
      className="inline-flex cursor-default select-none items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-500"
    >
      <span className="material-symbols-outlined text-[11px]" aria-hidden>
        timer
      </span>
      Runs: session only
    </span>
  );
}
