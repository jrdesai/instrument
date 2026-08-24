import { useLocation } from "react-router-dom";
import { isDesktop } from "../../bridge";
import { getToolById } from "../../registry";
import { useLastRunStore } from "../../store/lastRun";

export function StatusBar() {
  const location = useLocation();
  const routeToolId = location.pathname.match(/^\/tools\/(.+)$/)?.[1] ?? null;
  const activeTool = routeToolId ? getToolById(routeToolId) : null;
  const durationMs = useLastRunStore((s) => s.durationMs);
  const lastRunToolId = useLastRunStore((s) => s.toolId);
  const usesNetwork = activeTool?.network === true;
  const version =
    typeof import.meta.env.VITE_APP_VERSION === "string"
      ? import.meta.env.VITE_APP_VERSION
      : "dev";

  return (
    <footer
      className="hidden h-6 shrink-0 select-none items-center gap-3 border-t border-border-light bg-panel-light px-4 text-[10px] font-mono text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-500 md:flex"
      aria-label="Application status"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            usesNetwork ? "bg-sky-500" : "bg-emerald-500"
          }`}
          aria-hidden
        />
        <span className="truncate">
          {usesNetwork
            ? "Uses network — see tool badge"
            : "All processing on-device"}
        </span>
      </div>

      {routeToolId != null && lastRunToolId === routeToolId && durationMs != null ? (
        <span className="truncate text-slate-400 dark:text-slate-500">
          {isDesktop ? "rust" : "wasm"} · {durationMs.toFixed(1)} ms
        </span>
      ) : null}

      <span className="ml-auto shrink-0">v{version}</span>
    </footer>
  );
}
