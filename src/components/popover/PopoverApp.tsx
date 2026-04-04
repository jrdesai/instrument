import { Suspense, useEffect, useState } from "react";
import { getToolById } from "../../registry";
import { isClipboardRelevant } from "../../lib/clipboardRelevance";
import {
  usePopoverBootstrapStore,
  usePreferenceStore,
  useToolStore,
} from "../../store";
import { ToolErrorBoundary } from "../ui/ToolErrorBoundary";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { WasmLoadFailureOverlay } from "../ui/WasmLoadFailureOverlay";
import { useWasmLoadFailureStore } from "../../store/wasmLoadFailure";

function applyTrayClipboardFromRaw(
  toolId: string,
  raw: string | null | undefined
) {
  if (raw == null || raw === "") return;
  if (!usePreferenceStore.getState().clipboardAutoPaste) return;
  if (!isClipboardRelevant(toolId, raw)) return;
  const trimmed = raw.trim();
  // JWT must not hit persisted draftInputs (secrets on disk).
  if (toolId === "jwt") {
    usePopoverBootstrapStore.getState().setPending("jwt", trimmed);
  } else {
    useToolStore.getState().setDraftInput(toolId, trimmed);
  }
}

export function PopoverApp() {
  const [toolId, setToolId] = useState<string | null>(null);

  useEffect(() => {
    void import("@tauri-apps/api/core").then(({ invoke }) => {
      void invoke<string>("get_popover_tool").then((id) => {
        if (!id) return;
        void invoke<string | null>("consume_popover_clipboard_seed").then((raw) => {
          applyTrayClipboardFromRaw(id, raw ?? undefined);
          setToolId(id);
        });
      });
    });
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(({ listen }) => {
      void listen<string>("popover-navigate", (event) => {
        const id = event.payload;
        void import("@tauri-apps/api/core").then(({ invoke }) => {
          void invoke<string | null>("consume_popover_clipboard_seed").then((raw) => {
            applyTrayClipboardFromRaw(id, raw ?? undefined);
            setToolId(id);
          });
        });
      }).then((fn) => {
        unlisten = fn;
      });
    });
    return () => unlisten?.();
  }, []);

  // Spec parity: Rust also emits `popover-clipboard` (payload has text if listener is registered first).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(({ listen }) => {
      void listen<{ toolId: string; text: string }>("popover-clipboard", (event) => {
        const { toolId: eventToolId, text } = event.payload;
        applyTrayClipboardFromRaw(eventToolId, text);
      }).then((fn) => {
        unlisten = fn;
      });
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (!toolId) return;
    void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const w = getCurrentWindow();
      void w.show();
      // Without focus, the main window can remain key and we get an immediate blur → hide (Rust).
      void w.setFocus();
    });
  }, [toolId]);

  useEffect(() => {
    useWasmLoadFailureStore.getState().setWasmLoadFailure(null);
  }, [toolId]);

  if (!toolId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner label="Loading…" />
      </div>
    );
  }

  const tool = getToolById(toolId);
  if (!tool) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Tool not found
      </div>
    );
  }

  const Component = tool.component;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <header
        data-tauri-drag-region
        className="flex shrink-0 items-center justify-between border-b border-border-light bg-panel-light px-3 py-2 dark:border-border-dark dark:bg-panel-dark"
      >
        <div
          className="flex min-w-0 items-center gap-2"
          data-tauri-drag-region
        >
          <span className="material-symbols-outlined shrink-0 text-[16px] text-primary">
            {tool.icon}
          </span>
          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
            {tool.name}
          </span>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Open in main window"
            onClick={() => {
              void import("@tauri-apps/api/core").then(({ invoke }) => {
                void invoke("open_main_and_navigate", { toolId });
              });
            }}
            className="flex items-center rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined text-[14px]">
              open_in_full
            </span>
          </button>

          <button
            type="button"
            title="Close"
            onClick={() => {
              void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
                void getCurrentWindow().hide();
              });
            }}
            className="flex items-center rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800 dark:hover:text-red-400"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ToolErrorBoundary key={toolId} toolName={tool.name}>
          <Suspense fallback={<LoadingSpinner label="Loading tool…" />}>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <WasmLoadFailureOverlay />
              <Component />
            </div>
          </Suspense>
        </ToolErrorBoundary>
      </div>
    </div>
  );
}
