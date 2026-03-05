import { Suspense } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { getToolById } from "./registry";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./components/layout/DashboardPage";
import { LibraryPage } from "./components/layout/LibraryPage";
import { ChainsPage } from "./components/layout/ChainsPage";
import { HistoryPage } from "./components/layout/HistoryPage";
import { SettingsPage } from "./components/layout/SettingsPage";
import { ToolHeader } from "./components/layout/ToolHeader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import "./App.css";

function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? getToolById(toolId) : null;
  if (!tool) return <div className="p-4 text-slate-500">Tool not found.</div>;
  const Component = tool.component;
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-background-dark">
      <ToolHeader tool={tool} />
      <ErrorBoundary toolName={tool?.name}>
        <Suspense fallback={<LoadingSpinner label="Loading tool..." />}>
          <div className="flex-1 flex flex-col min-h-0">
            <Component />
          </div>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background-dark text-slate-100 font-display">
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/chains" element={<ChainsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tools/:toolId" element={<ToolPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
