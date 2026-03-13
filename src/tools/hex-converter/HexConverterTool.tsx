import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";

/** Matches Rust HexInput (camelCase). */
interface HexInputPayload {
  text: string;
  mode: "textToHex" | "hexToText";
  separator: "none" | "space" | "colon" | "dash";
}

/** Matches Rust HexOutput (camelCase). */
interface HexOutputPayload {
  result: string;
  byteCount: number;
  error?: string | null;
}

const RUST_COMMAND = "hex_process";
const TOOL_ID = "hex-converter";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;

function HexConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"textToHex" | "hexToText">("textToHex");
  const [separator, setSeparator] = useState<"none" | "space" | "colon" | "dash">("space");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [byteCount, setByteCount] = useState(0);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const [copyLabel, setCopyLabel] = useState("Copy output");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      currentMode: "textToHex" | "hexToText",
      currentSeparator: "none" | "space" | "colon" | "dash"
    ) => {
      if (text === "") {
        setOutput("");
        setError(null);
        setByteCount(0);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: HexInputPayload = {
          text,
          mode: currentMode,
          separator: currentSeparator,
        };
        const result = (await callTool(RUST_COMMAND, payload)) as HexOutputPayload;
        setOutput(result.result ?? "");
        setError(result.error ?? null);
        setByteCount(result.byteCount ?? 0);
        if (!result.error) {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
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
        setByteCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input, mode, separator);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, mode, separator, runProcess]);

  const handleSwap = useCallback(() => {
    const newInput = output;
    const newMode = mode === "textToHex" ? "hexToText" : "textToHex";
    setInput(newInput);
    setOutput(input);
    setMode(newMode);
    runProcess(newInput, newMode, separator);
  }, [input, output, mode, separator, runProcess]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
    setByteCount(0);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy output"), COPIED_DURATION_MS);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy output"), COPIED_DURATION_MS);
    }
  }, [output]);

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

  const headerLabel =
    byteCount > 0 ? `${byteCount} ${byteCount === 1 ? "byte" : "bytes"}` : "Output";

  const separatorDisabled = mode === "hexToText";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Input panel */}
        <div
          className="flex flex-col border-r border-border-light dark:border-border-dark shrink-0"
          style={{ width: `${leftPanelPercent}%` }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Lines: {lines}</span>
            <span>Chars: {charCount}</span>
          </div>
          <textarea
            aria-label="Hex converter input text"
            className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={
              mode === "textToHex"
                ? "Enter text to convert to hex…"
                : "Enter hex bytes to convert to text…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>{headerLabel}</span>
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          <pre
            aria-live="polite"
            aria-label="Hex converter output"
            className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
              error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {error ? error : output || (isLoading ? "…" : "")}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Mode */}
        <div className="flex flex-col gap-1" role="group" aria-label="Mode">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Mode
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Text to Hex mode"
              onClick={() => setMode("textToHex")}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                mode === "textToHex"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Text → Hex
            </button>
            <button
              type="button"
              aria-label="Hex to Text mode"
              onClick={() => setMode("hexToText")}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                mode === "hexToText"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Hex → Text
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Separator */}
        <div className="flex flex-col gap-1" role="group" aria-label="Separator">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Separator
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="No separator"
              onClick={() => setSeparator("none")}
              disabled={separatorDisabled}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                separator === "none"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              } ${
                separatorDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              None
            </button>
            <button
              type="button"
              aria-label="Space separator"
              onClick={() => setSeparator("space")}
              disabled={separatorDisabled}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                separator === "space"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              } ${
                separatorDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Space
            </button>
            <button
              type="button"
              aria-label="Colon separator"
              onClick={() => setSeparator("colon")}
              disabled={separatorDisabled}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                separator === "colon"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              } ${
                separatorDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Colon
            </button>
            <button
              type="button"
              aria-label="Dash separator"
              onClick={() => setSeparator("dash")}
              disabled={separatorDisabled}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                separator === "dash"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              } ${
                separatorDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Dash
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Actions */}
        <div
          className="flex flex-col gap-1 ml-auto"
          role="group"
          aria-label="Actions"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Swap input and output"
              onClick={handleSwap}
              className="px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Swap
            </button>
            <button
              type="button"
              aria-label="Copy output to clipboard"
              onClick={handleCopy}
              disabled={!output}
              className="px-3 py-1 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copyLabel}
            </button>
            <button
              type="button"
              aria-label="Clear input and output"
              onClick={handleClear}
              className="px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HexConverterTool;

