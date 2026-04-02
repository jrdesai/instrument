/**
 * Shown when the web WASM module failed to load (e.g. SPA fallback served instead of JS).
 */
export function WasmErrorBanner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="material-symbols-outlined text-[40px] text-amber-400">
        warning
      </span>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Tool unavailable
      </p>
      <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
        This tool couldn&apos;t load its required module. Try refreshing the page.
        If the problem persists, the deployment may be missing required files.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg border border-border-light bg-panel-light px-4 py-2 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
      >
        Reload page
      </button>
    </div>
  );
}
