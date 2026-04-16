import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CopyButton, PillButton } from "../../components/tool";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { UrlEncodeInput } from "../../bindings/UrlEncodeInput";
import type { UrlEncodeMode } from "../../bindings/UrlEncodeMode";
import type { UrlEncodeOutput } from "../../bindings/UrlEncodeOutput";
import type { UrlEncodeType } from "../../bindings/UrlEncodeType";

const RUST_COMMAND = "tool_url_encode_process";
const TOOL_ID = "url-encoder";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function UrlEncoderTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<UrlEncodeMode>("encode");
  const [encodeType, setEncodeType] = useState<UrlEncodeType>("component");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      currentMode: UrlEncodeMode,
      currentEncodeType: UrlEncodeType
    ) => {
      if (text === "") {
        setOutput("");
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: UrlEncodeInput = {
          text,
          mode: currentMode,
          encodeType: currentEncodeType,
        };
        const result = (await callTool(RUST_COMMAND, payload, { skipHistory: true })) as UrlEncodeOutput;
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
      runProcess(input, mode, encodeType);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, mode, encodeType, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleSwap = useCallback(() => {
    const newInput = output;
    const newMode = mode === "encode" ? "decode" : "encode";
    setInput(newInput);
    setDraft(newInput);
    setOutput(input);
    setMode(newMode);
    runProcess(newInput, newMode, encodeType);
  }, [input, output, mode, encodeType, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput("");
    setError(null);
  }, [setDraft]);

  const lines = input.split("\n").length;
  const charCount = input.length;

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
          className="flex flex-col border-r border-border-light dark:border-border-dark shrink-0"
          style={{ width: `${leftPanelPercent}%` }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0 min-h-[41px]">
            <span className="font-medium text-slate-600 dark:text-slate-300">Input</span>
            <span>Lines: {lines} · Chars: {charCount}</span>
          </div>
          <textarea
            aria-label="URL encoder input text"
            className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={
              mode === "encode"
                ? "Enter text to percent-encode…"
                : "Enter percent-encoded string to decode…"
            }
            value={input}
            onChange={(e) => {
              const v = e.target.value;
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
          className="w-1 shrink-0 bg-slate-200 dark:bg-slate-700 hover:bg-primary/50 transition-colors cursor-col-resize"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0 min-h-[41px]">
            <span className="font-medium text-slate-600 dark:text-slate-300">Output</span>
            {isLoading && <span className="text-primary animate-pulse">Processing…</span>}
          </div>
          {!error && !output && !isLoading ? (
            <div
              className="flex flex-1 items-center justify-center"
              aria-live="polite"
              aria-label="URL encoder output"
            >
              <span className="text-sm text-slate-400">Output will appear here</span>
            </div>
          ) : (
            <pre
              aria-live="polite"
              aria-label="URL encoder output"
              className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
                error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {error ? error : output || (isLoading ? "…" : "")}
            </pre>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-4 border-t border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Encode or decode mode"
        >
          <PillButton
            active={mode === "encode"}
            onClick={() => setMode("encode")}
            aria-label="Encode mode"
          >
            Encode
          </PillButton>
          <PillButton
            active={mode === "decode"}
            onClick={() => setMode("decode")}
            aria-label="Decode mode"
          >
            Decode
          </PillButton>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Encode type">
          <PillButton
            active={encodeType === "full"}
            onClick={() => setEncodeType("full")}
            aria-label="Full encoding (encodes / ? & =)"
          >
            Full
          </PillButton>
          <PillButton
            active={encodeType === "component"}
            onClick={() => setEncodeType("component")}
            aria-label="Component encoding (preserves /)"
          >
            Component
          </PillButton>
        </div>

        <button
          type="button"
          aria-label="Swap input and output"
          onClick={handleSwap}
          className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Swap
        </button>

        <button
          type="button"
          aria-label="Clear input and output"
          onClick={handleClear}
          className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Clear
        </button>

        <div className="ml-auto">
          <CopyButton
            value={output || undefined}
            label="Copy"
            variant="primary"
            className="py-1"
            aria-label="Copy output to clipboard"
          />
        </div>
      </footer>
    </div>
  );
}

export default UrlEncoderTool;
