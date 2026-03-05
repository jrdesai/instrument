import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";

/** Matches Rust Md5Input (camelCase). */
interface Md5InputPayload {
  text: string;
  uppercase: boolean;
}

/** Matches Rust Md5Output (camelCase). */
interface Md5OutputPayload {
  hash: string;
  length: number;
  error?: string | null;
}

const RUST_COMMAND = "md5_process";
const TOOL_ID = "md5-hash";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;
const MD5_LENGTH = 32;

function Md5HashTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [uppercase, setUppercase] = useState(false);
  const [hashEmpty, setHashEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy hash");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      text: string,
      useUppercase: boolean,
      currentHashEmpty: boolean
    ) => {
      if (!text.trim() && !currentHashEmpty) {
        setOutput("");
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: Md5InputPayload = { text, uppercase: useUppercase };
        const result = (await callTool(RUST_COMMAND, payload)) as Md5OutputPayload;
        setOutput(result.hash ?? "");
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
      runProcess(input, uppercase, hashEmpty);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, uppercase, hashEmpty, runProcess]);

  const handleClear = useCallback(() => {
    setInput("");
    runProcess("", uppercase, hashEmpty);
  }, [uppercase, hashEmpty, runProcess]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy hash"), COPIED_DURATION_MS);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy hash"), COPIED_DURATION_MS);
    }
  }, [output]);

  const lines = input.split("\n").length;
  const charCount = input.length;

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Input panel — left-weighted */}
        <div className="flex flex-col border-r border-border-dark shrink-0 w-[45%] min-w-[200px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-dark bg-panel-dark text-xs text-slate-400 shrink-0">
            <span>Input</span>
            <span>Lines: {lines}</span>
            <span>Chars: {charCount}</span>
          </div>
          <textarea
            aria-label="Text to hash with MD5"
            className="flex-1 w-full p-4 bg-background-dark text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder="Enter text to hash…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Output panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-dark bg-panel-dark text-xs text-slate-400 shrink-0">
            <span className="flex items-center gap-2">
              Hash ({MD5_LENGTH} chars)
              {hashEmpty && !input.trim() && output && (
                <span className="text-slate-500 text-xs">
                  Showing hash of empty string
                </span>
              )}
            </span>
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          {output ? (
            <pre
              aria-live="polite"
              aria-label="MD5 hash output"
              className="flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all text-slate-300"
            >
              {output}
            </pre>
          ) : error ? (
            <pre
              aria-live="polite"
              aria-label="MD5 hash error"
              className="flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all text-red-400"
            >
              {error}
            </pre>
          ) : (
            <p className="flex-1 p-4 text-slate-500 text-sm italic">
              Enter text above to generate hash
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-2 border-t border-border-dark bg-panel-dark shrink-0">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            aria-label="Uppercase hash (A–F)"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
          />
          <span className="text-sm text-slate-300">Uppercase</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            aria-label="Hash empty string"
            checked={hashEmpty}
            onChange={(e) => setHashEmpty(e.target.checked)}
            className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
          />
          <span className="text-sm text-slate-300">Hash empty string</span>
        </label>

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
          aria-label="Copy hash to clipboard"
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

export default Md5HashTool;
