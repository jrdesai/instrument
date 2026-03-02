import { Component, Suspense } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { getToolById } from "./registry";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./components/layout/DashboardPage";
import { LibraryPage } from "./components/layout/LibraryPage";
import { ChainsPage } from "./components/layout/ChainsPage";
import { HistoryPage } from "./components/layout/HistoryPage";
import { SettingsPage } from "./components/layout/SettingsPage";
import "./App.css";

class ToolErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="p-6 text-slate-300 space-y-2">
          <p className="font-semibold text-red-400">Tool failed to load</p>
          <p className="text-sm font-mono">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? getToolById(toolId) : null;
  if (!tool) return <div className="p-4 text-slate-500">Tool not found.</div>;
  const Component = tool.component;
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-background-dark">
      <ToolErrorBoundary>
        <Suspense fallback={<div className="p-4 text-slate-500">Loading…</div>}>
          <div className="flex-1 flex flex-col min-h-0">
            <Component />
          </div>
        </Suspense>
      </ToolErrorBoundary>
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
