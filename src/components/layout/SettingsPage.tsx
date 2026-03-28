import { useHistoryStore, usePreferenceStore, useToolStore } from "../../store";
import { APP_VERSION } from "../../version";
import { ConfirmButton } from "../ui/ConfirmButton";

export function SettingsPage() {
  const theme = usePreferenceStore((s) => s.theme);
  const setTheme = usePreferenceStore((s) => s.setTheme);

  const clearRecents = useToolStore((s) => s.clearRecents);
  const clearFavourites = useToolStore((s) => s.clearFavourites);
  const clearDraftInputs = useToolStore((s) => s.clearDraftInputs);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="shrink-0 px-8 py-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Preferences and appearance
        </p>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-8 py-8 max-w-2xl space-y-10">

          {/* ── Appearance ── */}
          <section role="group" aria-labelledby="settings-appearance-heading" className="flex flex-col gap-4">
            <h2
              id="settings-appearance-heading"
              className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Appearance
            </h2>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-700 dark:text-slate-300">Theme</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    theme === "light"
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    theme === "dark"
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-border-dark" />

          {/* ── Data ── */}
          <section role="group" aria-labelledby="settings-data-heading" className="flex flex-col gap-4">
            <h2
              id="settings-data-heading"
              className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Data
            </h2>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-border-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
              {/* Clear Recents */}
              <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear recent tools</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Removes the recently used list from the dashboard
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearRecents}
                  className="shrink-0 ml-4 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* Clear Favourites */}
              <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear favourites</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Unpins all starred tools
                  </p>
                </div>
                <ConfirmButton
                  label="Clear"
                  confirmLabel="Yes, clear"
                  onConfirm={clearFavourites}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                />
              </div>

              {/* Clear History */}
              <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear session history</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Removes all tool run history for this session
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="shrink-0 ml-4 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* Clear saved tool inputs */}
              <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear saved inputs</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Removes last-typed drafts stored for each tool (not session history)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearDraftInputs}
                  className="shrink-0 ml-4 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* Clear All Data */}
              <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Clear all data</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Clears recents, favourites, session history, and saved tool inputs in one go
                  </p>
                </div>
                <ConfirmButton
                  label="Clear all"
                  confirmLabel="Yes, clear all"
                  onConfirm={() => {
                    clearRecents();
                    clearFavourites();
                    clearHistory();
                    clearDraftInputs();
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-border-dark" />

          {/* ── About ── */}
          <section role="group" aria-labelledby="settings-about-heading" className="flex flex-col gap-4">
            <h2
              id="settings-about-heading"
              className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              About
            </h2>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-border-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark">
                <p className="text-sm text-slate-700 dark:text-slate-300">Version</p>
                <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                  v{APP_VERSION}
                </span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
