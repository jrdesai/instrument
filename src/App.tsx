import { Suspense, useEffect, useRef } from "react";
import { WasmLoadFailureOverlay } from "./components/ui/WasmLoadFailureOverlay";
import { useWasmLoadFailureStore } from "./store/wasmLoadFailure";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
} from "react-router-dom";
import { getPopoverTools, getToolById } from "./registry";
import { isDesktop } from "./bridge";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./components/layout/DashboardPage";
import { HistoryPage } from "./components/layout/HistoryPage";
import { SettingsPage } from "./components/layout/SettingsPage";
import { ToolHeader } from "./components/layout/ToolHeader";
import { ToolErrorBoundary } from "./components/ui/ToolErrorBoundary";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { usePreferenceStore, useToolStore } from "./store";
import { PopoverApp } from "./components/popover/PopoverApp";
import "./App.css";

const IS_POPOVER = window.__INSTRUMENT_POPOVER__ === true;

function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? getToolById(toolId) : null;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, [toolId]);

  useEffect(() => {
    useWasmLoadFailureStore.getState().setWasmLoadFailure(null);
  }, [toolId]);

  if (!tool) return <div className="p-4 text-slate-500 dark:text-slate-400">Tool not found.</div>;
  const Component = tool.component;
  return (
    <div ref={containerRef} tabIndex={-1} className="flex-1 flex flex-col min-h-0 w-full bg-background-light dark:bg-background-dark outline-none">
      <ToolHeader tool={tool} />
      <ToolErrorBoundary key={toolId} toolName={tool.name}>
        <Suspense fallback={<LoadingSpinner label="Loading tool..." />}>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <WasmLoadFailureOverlay />
            <Component />
          </div>
        </Suspense>
      </ToolErrorBoundary>
    </div>
  );
}

/** Desktop: tray visibility, favourites → tray menu, tray → navigate (inside Router). */
function TrayDesktopSync() {
  const navigate = useNavigate();
  const showTrayIcon = usePreferenceStore((s) => s.showTrayIcon);
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);

  useEffect(() => {
    if (!isDesktop) return;
    const syncHotkey = () => {
      const enabled = usePreferenceStore.getState().globalHotkeyEnabled;
      void import("@tauri-apps/api/core").then(({ invoke }) => {
        void invoke("set_global_hotkey_enabled", { enabled }).catch(() => {});
      });
    };
    if (usePreferenceStore.persist.hasHydrated()) syncHotkey();
    else return usePreferenceStore.persist.onFinishHydration(syncHotkey);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    void import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("set_tray_visible", { visible: showTrayIcon }).catch(() => {});
    });
  }, [showTrayIcon]);

  useEffect(() => {
    if (!isDesktop) return;
    void import("@tauri-apps/api/core").then(({ invoke }) => {
      const popoverById = new Map(
        getPopoverTools().map((t) => [t.id, t] as const)
      );
      const trayTools = favouriteToolIds
        .map((id) => popoverById.get(id))
        .filter((t): t is NonNullable<typeof t> => t != null)
        .map((t) => ({ id: t.id, name: t.name }));
      invoke("update_tray_menu", { tools: trayTools }).catch(() => {});
    });
  }, [favouriteToolIds]);

  useEffect(() => {
    if (!isDesktop) return;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(({ listen }) => {
      void listen<string>("navigate-to-tool", (event) => {
        navigate(`/tools/${event.payload}`);
      }).then((fn) => {
        unlisten = fn;
      });
    });
    return () => {
      unlisten?.();
    };
  }, [navigate]);

  return null;
}

function RoutedLayout() {
  return (
    <>
      <TrayDesktopSync />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/tools/:toolId" element={<ToolPage />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  const theme = usePreferenceStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      root.classList.toggle("dark", mq.matches);
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <BrowserRouter>
        {IS_POPOVER ? <PopoverApp /> : <RoutedLayout />}
      </BrowserRouter>
    </div>
  );
}

export default App;
