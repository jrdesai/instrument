import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { CopyButton, PillButton, ToolbarFooter } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";
import { useHistoryStore } from "../../store";
import type { Base64Input } from "../../bindings/Base64Input";
import type { Base64Mode } from "../../bindings/Base64Mode";
import type { Base64Output } from "../../bindings/Base64Output";

const RUST_COMMAND = "tool_base64_process";
const TOOL_ID = "base64-encoder";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function Base64Tool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Base64Mode>("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (text: string, currentMode: Base64Mode, currentUrlSafe: boolean) => {
      if (text === "") {
        setOutput("");
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: Base64Input = {
          text,
          urlSafe: currentUrlSafe,
          mode: currentMode,
        };
        const result = (await callTool(RUST_COMMAND, payload, { skipHistory: true })) as Base64Output;
        setOutput(result.result ?? "");
        setError(result.error ?? null);
        if (!result.error) {
          if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
          historyDebounceRef.current = setTimeout(() => {
            addHistoryEntry(TOOL_ID, {
              input: payload,
              output: result,
              timestamp: Date.now(),
            });
            historyDebounceRef.current = null;
          }, HISTORY_DEBOUNCE_MS);
        }
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : e != null
                  ? String(e)
                  : "Failed to run tool";
        setError(message);
        setOutput("");
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input, mode, urlSafe);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, mode, urlSafe, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const applyUploadedFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      if (mode === "encode") {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const buffer = ev.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          let binary = "";
          bytes.forEach((b) => {
            binary += String.fromCharCode(b);
          });
          setInput(binary);
          setDraft(binary);
        };
        reader.onerror = () => {
          setFileDropError("Failed to read file — it may be locked or unreadable.");
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = (ev.target?.result as string).trim();
          setInput(text);
          setDraft(text);
        };
        reader.onerror = () => {
          setFileDropError("Failed to read file — it may be locked or unreadable.");
        };
        reader.readAsText(file);
      }
    },
    [mode, setDraft]
  );

  const { isDragging: isFileDragging, dropZoneProps } = useFileDrop({
    onFileRaw: (file) => {
      setFileDropError(null);
      setError(null);
      applyUploadedFile(file);
    },
    onError: (msg) => setFileDropError(msg),
  });

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileDropError(null);
      applyUploadedFile(file);
      e.target.value = "";
    },
    [applyUploadedFile]
  );

  const handleBinaryDownload = useCallback(() => {
    if (!output || error) return;
    const bytes = Uint8Array.from(output, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ?? "decoded-file";
    a.click();
    URL.revokeObjectURL(url);
  }, [output, error, fileName]);

  const handleSwap = useCallback(() => {
    const newInput = output;
    const newMode = mode === "encode" ? "decode" : "encode";
    setInput(newInput);
    setDraft(newInput);
    setOutput(input);
    setMode(newMode);
    setFileName(null);
    setFileDropError(null);
    runProcess(newInput, newMode, urlSafe);
  }, [input, output, mode, urlSafe, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput("");
    setError(null);
    setFileDropError(null);
    setFileName(null);
  }, [setDraft]);

  const lines = input.split("\n").length;
  const charCount = input.length;
  const byteCount = new TextEncoder().encode(input).length;

  const isDragging = useRef(false);
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftPanelPercent(Math.min(90, Math.max(10, pct)));
    };
    const up = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Input panel */}
        <div
          className="relative flex flex-col border-r border-border-light dark:border-border-dark shrink-0"
          style={{ width: `${leftPanelPercent}%` }}
          {...dropZoneProps}
        >
          {isFileDragging && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[32px] text-primary/60">
                upload_file
              </span>
              <span className="text-sm font-medium text-primary/70">Drop file to load</span>
            </div>
          )}
          {fileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {fileDropError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0 min-h-[41px]">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {fileName ?? "Input"}
              </span>
              {fileName ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              ) : null}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input type="file" className="sr-only" onChange={handleFileUpload} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span>Lines: {lines}</span>
              <span>Chars: {charCount}</span>
              <span>Bytes: {byteCount}</span>
            </div>
          </div>
          <textarea
            aria-label="Base64 input text"
            className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={mode === "encode" ? "Enter text to encode…" : "Enter Base64 to decode…"}
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setFileDropError(null);
              setInput(v);
              setDraft(v);
            }}
            spellCheck={false}
          />
        </div>

        {/* Draggable divider */}
        <button
          type="button"
          aria-label="Resize panels"
          className="w-1 shrink-0 bg-border-light dark:bg-border-dark hover:bg-primary/50 transition-colors cursor-col-resize"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0 min-h-[41px]">
            <span>Output</span>
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          <pre
            aria-live="polite"
            aria-label="Base64 output"
            className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
              error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {error ? error : output || (isLoading ? "…" : "")}
          </pre>
        </div>
      </div>

      <ToolbarFooter
        groups={[
          {
            label: "Mode",
            children: (
              <>
                {(["encode", "decode"] as const).map((m) => (
                  <PillButton
                    key={m}
                    active={mode === m}
                    onClick={() => setMode(m)}
                    aria-label={
                      m === "encode" ? "Encode mode" : "Decode mode"
                    }
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </PillButton>
                ))}
              </>
            ),
          },
          {
            label: "Options",
            children: (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Use URL-safe Base64 alphabet"
                  checked={urlSafe}
                  onChange={(e) => setUrlSafe(e.target.checked)}
                  className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  URL Safe
                </span>
              </label>
            ),
          },
          {
            end: true,
            children: (
              <>
                <button
                  type="button"
                  aria-label="Swap input and output"
                  onClick={handleSwap}
                  className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Swap
                </button>
                <CopyButton
                  value={output || undefined}
                  label="Copy"
                  variant="primary"
                  className="py-1"
                  aria-label="Copy output to clipboard"
                />
                {mode === "decode" && output && !error ? (
                  <button
                    type="button"
                    onClick={handleBinaryDownload}
                    className="rounded-lg border border-border-light bg-panel-light px-3 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Download
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Clear input and output"
                  onClick={handleClear}
                  className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Clear
                </button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export default Base64Tool;
