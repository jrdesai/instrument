import { Suspense, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
} from "react-router-dom";
import { getToolById } from "./registry";
import { onTrayNavigateToTool, updateTrayMenu } from "./bridge";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./components/layout/DashboardPage";
import { LibraryPage } from "./components/layout/LibraryPage";
import { HistoryPage } from "./components/layout/HistoryPage";
import { SettingsPage } from "./components/layout/SettingsPage";
import { ToolHeader } from "./components/layout/ToolHeader";
import { ToolErrorBoundary } from "./components/ui/ToolErrorBoundary";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { usePreferenceStore, useToolStore } from "./store";
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
  const navigate = useNavigate();
  const favouriteToolIds = useToolStore((s) => s.favouriteToolIds);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const addToRecent = useToolStore((s) => s.addToRecent);

  useEffect(() => {
    const tools = favouriteToolIds
      .map((id) => getToolById(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({ id: t.id, name: t.name }));
    void updateTrayMenu(tools);
  }, [favouriteToolIds]);

  useEffect(
    () =>
      onTrayNavigateToTool((toolId) => {
        const tool = getToolById(toolId);
        if (tool) {
          setActiveTool(tool);
          addToRecent(tool);
          navigate(`/tools/${tool.id}`);
        }
      }),
    [navigate, setActiveTool, addToRecent]
  );

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/library" element={<LibraryPage />} />
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
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
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
