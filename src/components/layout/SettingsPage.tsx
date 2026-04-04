import { isDesktop, isWeb } from "../../bridge";
import { useHistoryStore, usePreferenceStore, useToolStore } from "../../store";
import { APP_VERSION } from "../../version";
import { ConfirmButton } from "../ui/ConfirmButton";

export function SettingsPage() {
  const theme = usePreferenceStore((s) => s.theme);
  const setTheme = usePreferenceStore((s) => s.setTheme);
  const welcomeDismissed = usePreferenceStore((s) => s.welcomeDismissed);
  const setWelcomeDismissed = usePreferenceStore((s) => s.setWelcomeDismissed);
  const showTrayIcon = usePreferenceStore((s) => s.showTrayIcon);
  const setShowTrayIcon = usePreferenceStore((s) => s.setShowTrayIcon);
  const clipboardAutoPaste = usePreferenceStore((s) => s.clipboardAutoPaste);
  const setClipboardAutoPaste = usePreferenceStore((s) => s.setClipboardAutoPaste);
  const globalHotkeyEnabled = usePreferenceStore((s) => s.globalHotkeyEnabled);
  const setGlobalHotkeyEnabled = usePreferenceStore((s) => s.setGlobalHotkeyEnabled);

  const hotkeyKbd =
    typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)
      ? "⌘⇧Space"
      : "Ctrl+Shift+Space";

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
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      theme === t
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-border-dark" />

          {/* ── Desktop ── */}
          {isDesktop && (
            <>
              <section
                role="group"
                aria-labelledby="settings-desktop-heading"
                className="flex flex-col gap-4"
              >
                <h2
                  id="settings-desktop-heading"
                  className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Desktop
                </h2>

                <div className="flex flex-col divide-y divide-slate-100 dark:divide-border-dark overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
                  <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Menu bar icon
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        Show Instrument in the menu bar for quick access to favourite
                        tools
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showTrayIcon}
                      onClick={() => setShowTrayIcon(!showTrayIcon)}
                      className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        showTrayIcon
                          ? "bg-primary"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          showTrayIcon ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Paste clipboard on open
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        Auto-fill the tool input with clipboard content when opening from the menu
                        bar
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={clipboardAutoPaste}
                      onClick={() => setClipboardAutoPaste(!clipboardAutoPaste)}
                      className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        clipboardAutoPaste
                          ? "bg-primary"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          clipboardAutoPaste ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">Global shortcut</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        Press{" "}
                        <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-800">
                          {hotkeyKbd}
                        </kbd>{" "}
                        anywhere to open the tool picker
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={globalHotkeyEnabled}
                      onClick={() => {
                        const next = !globalHotkeyEnabled;
                        setGlobalHotkeyEnabled(next);
                        void import("@tauri-apps/api/core").then(({ invoke }) => {
                          void invoke("set_global_hotkey_enabled", { enabled: next });
                        });
                      }}
                      className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        globalHotkeyEnabled
                          ? "bg-primary"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          globalHotkeyEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <div className="h-px bg-slate-200 dark:bg-border-dark" />
            </>
          )}

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
              {isWeb && (
                <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark border-t border-border-light dark:border-border-dark">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">Desktop App</p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      Download the native app for faster, fully offline use
                    </p>
                  </div>
                  <span
                    title="Desktop app coming soon"
                    className="ml-4 flex shrink-0 cursor-not-allowed items-center gap-1 text-xs text-slate-400 dark:text-slate-500"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden>
                      schedule
                    </span>
                    Coming Soon
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark border-t border-border-light dark:border-border-dark">
                <p className="text-sm text-slate-700 dark:text-slate-300">Source</p>
                <a
                  href="https://github.com/jrdesai/instrument"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden>
                    open_in_new
                  </span>
                  GitHub
                </a>
              </div>
              {welcomeDismissed && (
                <div className="flex items-center justify-between px-4 py-3 bg-panel-light dark:bg-panel-dark border-t border-border-light dark:border-border-dark">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">Welcome card</p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      Show the welcome card on the home screen again
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWelcomeDismissed(false)}
                    className="ml-4 shrink-0 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    Show again
                  </button>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
