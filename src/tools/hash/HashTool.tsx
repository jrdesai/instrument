import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { HashInput } from "../../bindings/HashInput";
import type { HashOutput } from "../../bindings/HashOutput";
import type { HashOutputFormat } from "../../bindings/HashOutputFormat";

const RUST_COMMAND = "hash_process";
const TOOL_ID = "hash";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const COPIED_DURATION_MS = 1500;

function historySafeInput(payload: HashInput): HashInput {
  const key = payload.hmacKey.trim();
  return {
    ...payload,
    hmacKey: key ? "[redacted]" : "",
  };
}

function copyAllText(results: { algorithm: string; value: string }[]): string {
  return results.map((r) => `${r.algorithm.padEnd(10)} ${r.value}`).join("\n");
}

function HashTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);
  const [hmacKey, setHmacKey] = useState("");
  const [outputFormat, setOutputFormat] = useState<HashOutputFormat>("hex");
  const [uppercase, setUppercase] = useState(false);
  const [hashEmpty, setHashEmpty] = useState(false);
  const [results, setResults] = useState<HashOutput["results"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rowCopyLabel, setRowCopyLabel] = useState<string | null>(null);
  const [allCopyLabel, setAllCopyLabel] = useState("Copy all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (payload: HashInput) => {
      if (!payload.text.trim() && !payload.hashEmpty) {
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        setResults([]);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as HashOutput;
        if (result.error) {
          if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
          setResults(result.results ?? []);
          setError(result.error);
          return;
        }
        setResults(result.results ?? []);
        setError(null);
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => {
          addHistoryEntry(TOOL_ID, {
            input: historySafeInput(payload),
            output: result,
            timestamp: Date.now(),
          });
          historyDebounceRef.current = null;
        }, HISTORY_DEBOUNCE_MS);
      } catch (e) {
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
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
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    const payload: HashInput = {
      text: input,
      hashEmpty,
      outputFormat,
      uppercase,
      hmacKey,
    };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(payload);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, hmacKey, outputFormat, uppercase, hashEmpty, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setDraft("");
    setHmacKey("");
    setResults([]);
    setError(null);
  }, [setDraft]);

  const copyRow = useCallback(async (algorithm: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setRowCopyLabel(algorithm);
      setTimeout(() => setRowCopyLabel(null), COPIED_DURATION_MS);
    } catch {
      setRowCopyLabel(`fail:${algorithm}`);
      setTimeout(() => setRowCopyLabel(null), COPIED_DURATION_MS);
    }
  }, []);

  const copyAll = useCallback(async () => {
    const lines = results.filter((r) => r.value);
    if (lines.length === 0) return;
    const text = copyAllText(lines);
    try {
      await navigator.clipboard.writeText(text);
      setAllCopyLabel("Copied");
      setTimeout(() => setAllCopyLabel("Copy all"), COPIED_DURATION_MS);
    } catch {
      setAllCopyLabel("Copy failed");
      setTimeout(() => setAllCopyLabel("Copy all"), COPIED_DURATION_MS);
    }
  }, [results]);

  const lines = input.split("\n").length;
  const charCount = input.length;
  const showHmacNote = hmacKey.trim().length > 0;
  const longAlgos = new Set(["SHA-512", "SHA3-512"]);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>Input</span>
          <span>Lines: {lines}</span>
          <span>Chars: {charCount}</span>
          {isLoading && <span className="text-primary">Processing…</span>}
        </div>
        <textarea
          aria-label="Text to hash"
          className="min-h-[120px] w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-y outline-none focus:ring-0 border-0 border-b border-border-light dark:border-border-dark shrink-0"
          placeholder="Enter text to hash…"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setDraft(e.target.value);
          }}
          spellCheck={false}
        />

        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark space-y-2 shrink-0">
          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
            <span>HMAC key (optional)</span>
            <input
              type="password"
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark font-mono text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Secret key for HMAC mode"
              value={hmacKey}
              onChange={(e) => setHmacKey(e.target.value)}
            />
          </label>
          {showHmacNote ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your key and input never leave this device.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-border-light dark:border-border-dark text-sm shrink-0">
          <fieldset className="flex flex-wrap items-center gap-3 border-0 p-0 m-0">
            <legend className="sr-only">Output format</legend>
            <span className="text-slate-600 dark:text-slate-400">Format</span>
            {(
              [
                ["hex", "hex"] as const,
                ["base64", "B64"] as const,
                ["base64url", "B64url"] as const,
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="hash-output-format"
                  checked={outputFormat === value}
                  onChange={() => setOutputFormat(value)}
                  className="text-primary focus:ring-primary"
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Uppercase hex"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              disabled={outputFormat !== "hex"}
              className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary disabled:opacity-40"
            />
            <span className="text-slate-700 dark:text-slate-300">Uppercase</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Hash empty input"
              checked={hashEmpty}
              onChange={(e) => setHashEmpty(e.target.checked)}
              className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
            />
            <span className="text-slate-700 dark:text-slate-300">Hash empty input</span>
          </label>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
          {error ? (
            <pre
              aria-live="polite"
              className="text-sm font-mono whitespace-pre-wrap break-all text-red-600 dark:text-red-400"
            >
              {error}
            </pre>
          ) : null}
          {results.map((row) => (
            <div
              key={row.algorithm}
              className="flex flex-wrap items-start gap-2 border-b border-border-light/60 dark:border-border-dark/60 pb-3 last:border-0"
            >
              <div className="flex items-center gap-2 shrink-0 w-28 sm:w-32">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {row.algorithm}
                </span>
                {showHmacNote ? (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    HMAC
                  </span>
                ) : null}
              </div>
              <div
                className={`flex-1 min-w-0 font-mono text-xs break-all text-slate-700 dark:text-slate-300 ${
                  longAlgos.has(row.algorithm) ? "" : "sm:text-sm"
                }`}
              >
                {row.value || "—"}
              </div>
              <button
                type="button"
                aria-label={`Copy ${row.algorithm}`}
                onClick={() => copyRow(row.algorithm, row.value)}
                disabled={!row.value}
                className="shrink-0 px-2 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {rowCopyLabel === row.algorithm
                  ? "Copied"
                  : rowCopyLabel === `fail:${row.algorithm}`
                    ? "Failed"
                    : "Copy"}
              </button>
            </div>
          ))}
          {!error && results.length === 0 && !isLoading ? (
            <p className="text-slate-500 text-sm italic">
              Enter text above to generate hashes
            </p>
          ) : null}
        </div>
      </div>

      <footer className="flex items-center gap-3 px-4 py-2 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={copyAll}
          disabled={!results.some((r) => r.value)}
          className="ml-auto px-3 py-1 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {allCopyLabel}
        </button>
      </footer>
    </div>
  );
}

export default HashTool;
