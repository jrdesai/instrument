import { Suspense, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import { getToolById } from "./registry";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./components/layout/DashboardPage";
import { HistoryPage } from "./components/layout/HistoryPage";
import { SettingsPage } from "./components/layout/SettingsPage";
import { ToolHeader } from "./components/layout/ToolHeader";
import { ToolErrorBoundary } from "./components/ui/ToolErrorBoundary";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { usePreferenceStore } from "./store";
import "./App.css";

function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? getToolById(toolId) : null;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, [toolId]);

  if (!tool) return <div className="p-4 text-slate-500 dark:text-slate-400">Tool not found.</div>;
  const Component = tool.component;
  return (
    <div ref={containerRef} tabIndex={-1} className="flex-1 flex flex-col min-h-0 w-full bg-background-light dark:bg-background-dark outline-none">
      <ToolHeader tool={tool} />
      <ToolErrorBoundary key={toolId} toolName={tool.name}>
        <Suspense fallback={<LoadingSpinner label="Loading tool..." />}>
          <div className="flex-1 flex flex-col min-h-0">
            <Component />
          </div>
        </Suspense>
      </ToolErrorBoundary>
    </div>
  );
}

function RoutedLayout() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tools/:toolId" element={<ToolPage />} />
      </Route>
    </Routes>
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
        <RoutedLayout />
      </BrowserRouter>
    </div>
  );
}

export default App;
