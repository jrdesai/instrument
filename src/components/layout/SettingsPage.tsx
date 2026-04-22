import { useCallback, useEffect, useState } from "react";
import { callTool, isDesktop, isWeb } from "../../bridge";
import { useHistoryStore, usePreferenceStore, useToolStore } from "../../store";
import { APP_VERSION } from "../../version";
import { ConfirmButton } from "../ui/ConfirmButton";

const STORAGE_SUMMARY_ROWS = [
  {
    icon: "timer",
    label: "Session history",
    detail: "Kept in memory · cleared when you close the app",
    badge: "Memory only" as const,
    iconClass: "text-slate-400",
  },
  {
    icon: "star",
    label: "Favourites",
    detail: "Saved locally · persists across sessions",
    badge: "Persisted" as const,
    iconClass: "text-primary",
  },
  {
    icon: "edit_note",
    label: "Draft inputs",
    detail: "Last-typed text per tool · saved locally",
    badge: "Persisted" as const,
    iconClass: "text-primary",
  },
  {
    icon: "tune",
    label: "Preferences",
    detail: "Theme, role, settings · saved locally",
    badge: "Persisted" as const,
    iconClass: "text-primary",
  },
  {
    icon: "lock",
    label: "Sensitive tools",
    detail: "JWT, TOTP, passwords, keys · never stored anywhere",
    badge: "Never stored" as const,
    iconClass: "text-amber-500",
  },
] as const;

/** Desktop CLI commands are generated as `Result<CliStatus, string>` — unwrap for UI state. */
type CliUiStatus = {
  installed: boolean;
  installPath?: string;
  error?: string;
  pathInEnv?: boolean;
};

function normalizeCliStatusPayload(raw: unknown): CliUiStatus {
  if (raw && typeof raw === "object" && "status" in raw) {
    const r = raw as { status: string; data?: unknown; error?: unknown };
    if (r.status === "error") {
      const msg =
        typeof r.error === "string"
          ? r.error
          : r.error != null
            ? String(r.error)
            : "Command failed";
      return { installed: false, error: msg };
    }
    if (r.status === "ok" && r.data != null && typeof r.data === "object") {
      const d = r.data as Record<string, unknown>;
      return {
        installed: Boolean(d.installed),
        installPath: typeof d.installPath === "string" ? d.installPath : undefined,
        error: typeof d.error === "string" ? d.error : undefined,
        pathInEnv: Boolean(d.pathInEnv),
      };
    }
  }
  if (raw && typeof raw === "object" && "installed" in (raw as object)) {
    const d = raw as Record<string, unknown>;
    return {
      installed: Boolean(d.installed),
      installPath: typeof d.installPath === "string" ? d.installPath : undefined,
      error: typeof d.error === "string" ? d.error : undefined,
      pathInEnv: Boolean(d.pathInEnv),
    };
  }
  return { installed: false, error: "Unexpected response from app" };
}

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
  const [cliStatus, setCliStatus] = useState<CliUiStatus | null>(null);
  const [cliLoading, setCliLoading] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    callTool("cli_status", null, { skipHistory: true })
      .then((raw) => setCliStatus(normalizeCliStatusPayload(raw)))
      .catch((err) =>
        setCliStatus({
          installed: false,
          error: err instanceof Error ? err.message : String(err),
        })
      );
  }, [isDesktop]);

  const handleCliToggle = useCallback(async () => {
    setCliLoading(true);
    try {
      const command = cliStatus?.installed ? "cli_uninstall" : "cli_install";
      const raw = await callTool(command, null, { skipHistory: true });
      setCliStatus(normalizeCliStatusPayload(raw));
    } catch (err) {
      setCliStatus((prev) => ({
        installed: prev?.installed ?? false,
        installPath: prev?.installPath,
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setCliLoading(false);
    }
  }, [cliStatus?.installed]);

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
                        if (isDesktop) {
                          void callTool("set_global_hotkey_enabled", next, {
                            skipHistory: true,
                          })
                            .then((result) => {
                              if (
                                result &&
                                typeof result === "object" &&
                                "status" in result &&
                                (result as { status: string }).status === "error"
                              ) {
                                setGlobalHotkeyEnabled(!next);
                              }
                            })
                            .catch(() => {
                              setGlobalHotkeyEnabled(!next);
                            });
                        }
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

                  {cliStatus !== null && (
                    <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          CLI integration
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                          {cliStatus.installed ? (
                            <>
                              <code className="font-mono">instrument</code> is available in your
                              terminal
                              {cliStatus.installPath && (
                                <span className="ml-1 opacity-60">
                                  · {cliStatus.installPath}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              Install <code className="font-mono">instrument</code> to use tools
                              from your terminal
                            </>
                          )}
                        </p>
                        {cliStatus.installed && !cliStatus.pathInEnv && (
                          <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">
                            <code className="font-mono">~/.local/bin</code> is not in your PATH —{" "}
                            <code className="font-mono">instrument</code> won't be found in the terminal.{" "}
                            <button
                              type="button"
                              className="underline hover:no-underline"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  'export PATH="$HOME/.local/bin:$PATH"'
                                )
                              }
                            >
                              Copy export line
                            </button>{" "}
                            and add it to your <code className="font-mono">~/.zshrc</code>.
                          </p>
                        )}
                        {cliStatus.error && (
                          <p className="mt-0.5 text-xs text-red-400">{cliStatus.error}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCliToggle}
                        disabled={cliLoading}
                        className={`ml-4 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          cliStatus.installed
                            ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {cliLoading ? "…" : cliStatus.installed ? "Uninstall" : "Install"}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <div className="h-px bg-slate-200 dark:bg-border-dark" />
            </>
          )}

          {/* ── Privacy & Data ── */}
          <section
            role="group"
            aria-labelledby="settings-privacy-heading"
            className="flex flex-col gap-4"
          >
            <h2
              id="settings-privacy-heading"
              className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Privacy & Data
            </h2>

            <div className="overflow-hidden rounded-xl border border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark">
              <div className="border-b border-border-light px-4 py-3 dark:border-border-dark">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  What Instrument stores on this device
                </p>
              </div>
              {STORAGE_SUMMARY_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    i < STORAGE_SUMMARY_ROWS.length - 1
                      ? "border-b border-border-light dark:border-border-dark"
                      : ""
                  }`}
                >
                  <span
                    className={`material-symbols-outlined mt-0.5 shrink-0 text-[16px] ${row.iconClass}`}
                    aria-hidden
                  >
                    {row.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {row.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{row.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      row.badge === "Never stored"
                        ? "border border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {row.badge}
                  </span>
                </div>
              ))}
              <div className="border-t border-border-light bg-slate-50 px-4 py-3 dark:border-border-dark dark:bg-background-dark">
                <p className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined shrink-0 text-[14px] text-primary" aria-hidden>
                    shield
                  </span>
                  <span>
                    Nothing is ever sent to a server. All data stays on this device.
                    {isWeb ? (
                      <span className="text-slate-400"> · Web: stored in this browser only.</span>
                    ) : null}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg border border-border-light dark:divide-border-dark dark:border-border-dark">
              {/* Clear Recents */}
              <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear recent tools</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    Removes the recently used list from the dashboard
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearRecents}
                  className="ml-4 shrink-0 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  Clear
                </button>
              </div>

              {/* Clear Favourites */}
              <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear favourites</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    Unpins all starred tools
                  </p>
                </div>
                <ConfirmButton
                  label="Clear"
                  confirmLabel="Yes, clear"
                  onConfirm={clearFavourites}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                />
              </div>

              {/* Clear History */}
              <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear session history</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    Session history is already cleared when you close the app. Clear it now if
                    needed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="ml-4 shrink-0 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  Clear
                </button>
              </div>

              {/* Clear saved tool inputs */}
              <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Clear saved inputs</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    Removes last-typed drafts stored for each tool (not session history)
                  </p>
                </div>
                <ConfirmButton
                  label="Clear"
                  confirmLabel="Clear inputs"
                  onConfirm={clearDraftInputs}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                />
              </div>

              {/* Clear All Data */}
              <div className="flex items-center justify-between bg-panel-light px-4 py-3 dark:bg-panel-dark">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Clear all data</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
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
                  className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
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
                  <a
                    href="https://github.com/jrdesai/instrument/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden>
                      download
                    </span>
                    Download
                  </a>
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
