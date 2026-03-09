import { usePreferenceStore } from "../../store";

export function SettingsPage() {
  const theme = usePreferenceStore((s) => s.theme);
  const setTheme = usePreferenceStore((s) => s.setTheme);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background-light dark:bg-background-dark">
      <div className="px-8 py-6 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-panel-dark">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Preferences and appearance
        </p>
      </div>
      <div className="flex-1 p-8 max-w-2xl">
        <section
          className="flex flex-col gap-3"
          role="group"
          aria-labelledby="settings-appearance-heading"
        >
          <h2
            id="settings-appearance-heading"
            className="text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wider"
          >
            Appearance
          </h2>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Theme
            </span>
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
      </div>
    </div>
  );
}
