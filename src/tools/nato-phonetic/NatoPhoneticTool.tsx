import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CopyButton, PillButton } from "../../components/tool";
import { callTool } from "../../bridge";
import { extractErrorMessage } from "../../lib/extractErrorMessage";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { NatoPhoneticInput } from "../../bindings/NatoPhoneticInput";
import type { NatoPhoneticMode } from "../../bindings/NatoPhoneticMode";
import type { NatoPhoneticOutput } from "../../bindings/NatoPhoneticOutput";

const RUST_COMMAND = "tool_nato_phonetic_process";
const TOOL_ID = "nato-phonetic";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function NatoPhoneticTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<NatoPhoneticMode>("encode");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (text: string, currentMode: NatoPhoneticMode) => {
      if (text.trim() === "") {
        setOutput("");
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: NatoPhoneticInput = { text, mode: currentMode };
        const result = (await callTool(RUST_COMMAND, payload, { skipHistory: true })) as NatoPhoneticOutput;
        setOutput(result.result ?? "");
        setError(result.error ?? null);
        if (!result.error && result.result) {
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
        setError(extractErrorMessage(e, "Failed to run tool"));
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
      runProcess(input, mode);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, mode, runProcess]);

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
    runProcess(newInput, newMode);
  }, [input, output, mode, runProcess, setDraft]);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setOutput("");
    setError(null);
  }, [setDraft]);

  const isDragging = useRef(false);
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setLeftPanelPercent(Math.min(90, Math.max(10, (e.clientX / window.innerWidth) * 100)));
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

  const lines = input.split("\n").length;
  const charCount = input.length;

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-0 flex-1">
        {/* Input panel */}
        <div
          className="flex shrink-0 flex-col border-r border-border-light dark:border-border-dark"
          style={{ width: `${leftPanelPercent}%` }}
        >
          <div className="flex min-h-[41px] shrink-0 items-center justify-between border-b border-border-light bg-panel-light px-3 py-2 text-xs text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">Input</span>
            <span>
              Lines: {lines} · Chars: {charCount}
            </span>
          </div>
          <textarea
            aria-label="NATO phonetic input text"
            className="h-full w-full flex-1 resize-none border-0 bg-background-light p-4 font-mono text-sm text-slate-900 outline-none focus:ring-0 dark:bg-background-dark dark:text-slate-100"
            placeholder={
              mode === "encode"
                ? "Enter text to convert to NATO phonetic words…"
                : "Enter NATO words separated by spaces (e.g. Hotel Echo Lima Lima Oscar)…"
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
          className="w-1 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-primary/50 dark:bg-slate-700"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[41px] shrink-0 items-center justify-between border-b border-border-light bg-panel-light px-3 py-2 text-xs text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">Output</span>
            {isLoading && <span className="animate-pulse text-primary">Processing…</span>}
          </div>
          {!error && !output && !isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-sm text-slate-400">Output will appear here</span>
            </div>
          ) : (
            <pre
              aria-live="polite"
              aria-label="NATO phonetic output"
              className={`flex-1 overflow-auto whitespace-pre break-normal p-4 font-mono text-sm ${
                error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {error ? error : output || (isLoading ? "…" : "")}
            </pre>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-4 border-t border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
        <div className="flex items-center gap-1" role="group" aria-label="Encode or decode mode">
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

export default NatoPhoneticTool;
