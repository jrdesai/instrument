import { isWeb } from "../../bridge";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { usePreferenceStore } from "../../store";

export function PwaInstallBanner() {
  const dismissed = usePreferenceStore((s) => s.pwaInstallDismissed);
  const setDismissed = usePreferenceStore((s) => s.setPwaInstallDismissed);
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();

  if (!isWeb || dismissed || isInstalled || !canInstall) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span className="material-symbols-outlined text-[16px] text-primary">install_desktop</span>
        <span>Install Instrument for faster access — works offline too.</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => void triggerInstall()}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
          className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
