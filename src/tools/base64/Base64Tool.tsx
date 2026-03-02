import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";

/** Matches Rust Base64Input (camelCase). Mode values match serde rename: encode/decode. */
interface Base64InputPayload {
  text: string;
  urlSafe: boolean;
  mode: "encode" | "decode";
}

/** Matches Rust Base64Output (camelCase). */
interface Base64OutputPayload {
  result: string;
  byteCount: number;
  charCount: number;
  error?: string | null;
}

const RUST_COMMAND = "base64_process";
const TOOL_ID = "base64-encoder";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;

function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const [copyLabel, setCopyLabel] = useState("Copy output");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (text: string, currentMode: typeof mode, currentUrlSafe: boolean) => {
      if (text === "") {
        setOutput("");
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: Base64InputPayload = {
          text,
          urlSafe: currentUrlSafe,
          mode: currentMode,
        };
        const result = (await callTool(RUST_COMMAND, payload)) as Base64OutputPayload;
        setOutput(result.result ?? "");
        setError(result.error ?? null);
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

  const handleSwap = useCallback(() => {
    const newInput = output;
    const newMode = mode === "encode" ? "decode" : "encode";
    setInput(newInput);
    setOutput(input);
    setMode(newMode);
    runProcess(newInput, newMode, urlSafe);
  }, [input, output, mode, urlSafe, runProcess]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
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
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Input panel */}
        <div
          className="flex flex-col border-r border-border-dark shrink-0"
          style={{ width: `${leftPanelPercent}%` }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-dark bg-panel-dark text-xs text-slate-400 shrink-0">
            <span>Lines: {lines}</span>
            <span>Chars: {charCount}</span>
            <span>Bytes: {byteCount}</span>
          </div>
          <textarea
            aria-label="Base64 input text"
            className="flex-1 w-full p-4 bg-background-dark text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={mode === "encode" ? "Enter text to encode…" : "Enter Base64 to decode…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Draggable divider */}
        <button
          type="button"
          aria-label="Resize panels"
          className="w-1 shrink-0 bg-border-dark hover:bg-primary/50 transition-colors cursor-col-resize"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-dark bg-panel-dark text-xs text-slate-400 shrink-0">
            <span>Output</span>
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          <pre
            aria-live="polite"
            aria-label="Base64 output"
            className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
              error ? "text-red-400" : "text-slate-300"
            }`}
          >
            {error ? error : output || (isLoading ? "…" : "")}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-2 border-t border-border-dark bg-panel-dark shrink-0">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            aria-label="Use URL-safe Base64 alphabet"
            checked={urlSafe}
            onChange={(e) => setUrlSafe(e.target.checked)}
            className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
          />
          <span className="text-sm text-slate-300">URL Safe</span>
        </label>

        <div className="flex items-center gap-1" role="group" aria-label="Encode or decode mode">
          <button
            type="button"
            aria-label="Encode mode"
            onClick={() => setMode("encode")}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              mode === "encode"
                ? "bg-primary text-white"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            Encode
          </button>
          <button
            type="button"
            aria-label="Decode mode"
            onClick={() => setMode("decode")}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              mode === "decode"
                ? "bg-primary text-white"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            Decode
          </button>
        </div>

        <button
          type="button"
          aria-label="Swap input and output"
          onClick={handleSwap}
          className="px-3 py-1 text-sm text-slate-300 hover:text-primary hover:bg-slate-700 rounded-lg transition-colors"
        >
          Swap
        </button>

        <button
          type="button"
          aria-label="Clear input and output"
          onClick={handleClear}
          className="px-3 py-1 text-sm text-slate-300 hover:text-primary hover:bg-slate-700 rounded-lg transition-colors"
        >
          Clear
        </button>

        <button
          type="button"
          aria-label="Copy output to clipboard"
          onClick={handleCopy}
          disabled={!output}
          className="ml-auto px-3 py-1 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copyLabel}
        </button>
      </footer>
    </div>
  );
}

export default Base64Tool;
