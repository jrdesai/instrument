import {
  useCallback,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useHistoryStore } from "../../store";

type UuidVersion = "v4" | "v7";

/** Matches Rust UuidInput (camelCase). */
interface UuidInputPayload {
  version: UuidVersion;
  count: number;
  uppercase: boolean;
}

/** Matches Rust UuidOutput (camelCase). */
interface UuidOutputPayload {
  uuids: string[];
  error?: string | null;
}

const RUST_COMMAND = "uuid_process";
const TOOL_ID = "uuid-generator";
const COPIED_DURATION_MS = 1500;

function UuidGeneratorTool() {
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState<number>(1);
  const [uppercase, setUppercase] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      currentVersion: UuidVersion,
      currentCount: number,
      currentUppercase: boolean
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const payload: UuidInputPayload = {
          version: currentVersion,
          count: currentCount,
          uppercase: currentUppercase,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as UuidOutputPayload;
        setUuids(result.uuids ?? []);
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
        setUuids([]);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  const handleGenerate = useCallback(() => {
    runProcess(version, count, uppercase);
  }, [version, count, uppercase, runProcess]);

  const handleCopyLine = useCallback(async (index: number) => {
    const value = uuids[index];
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), COPIED_DURATION_MS);
    } catch {
      // ignore copy errors
    }
  }, [uuids]);

  const handleCopyAll = useCallback(async () => {
    if (!uuids.length) return;
    try {
      await navigator.clipboard.writeText(uuids.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    }
  }, [uuids]);

  const handleCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(100, Math.max(1, value));
    setCount(clamped);
  }, []);

  const headerCount = uuids.length;
  const headerLabel =
    headerCount > 0
      ? `${headerCount} ${headerCount === 1 ? "UUID" : "UUIDs"}`
      : "No UUIDs generated yet";

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dark bg-panel-dark text-sm">
        <div className="flex flex-col">
          <span className="font-semibold">UUID Generator</span>
          <span className="text-xs text-slate-400">{headerLabel}</span>
        </div>
      </div>

      {/* Output list */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {error ? (
          <div className="text-red-400 text-sm font-mono whitespace-pre-wrap">
            {error}
          </div>
        ) : uuids.length === 0 ? (
          <p className="text-slate-500 text-sm italic">
            Click Generate to create UUIDs
          </p>
        ) : (
          <ul className="space-y-2">
            {uuids.map((id, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 px-3 py-2 border border-border-dark rounded-lg bg-panel-dark"
              >
                <span className="font-mono text-sm text-slate-300 break-all">
                  {id}
                </span>
                <button
                  type="button"
                  aria-label="Copy UUID"
                  onClick={() => handleCopyLine(index)}
                  className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                >
                  {copiedIndex === index ? "Copied" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer controls */}
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-dark bg-panel-dark shrink-0">
        {/* Version selector */}
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="UUID version"
        >
          <button
            type="button"
            onClick={() => setVersion("v4")}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              version === "v4"
                ? "bg-primary text-white"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            V4 — Random
          </button>
          <button
            type="button"
            onClick={() => setVersion("v7")}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              version === "v7"
                ? "bg-primary text-white"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            V7 — Time-ordered
          </button>
        </div>

        {/* Count input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Count</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease count"
              onClick={() => handleCountChange(count - 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-dark text-slate-300 hover:text-primary hover:bg-slate-700 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => handleCountChange(Number(e.target.value))}
              className="w-16 px-2 py-1 text-xs bg-background-dark border border-border-dark rounded-lg text-center text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              aria-label="Increase count"
              onClick={() => handleCountChange(count + 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-dark text-slate-300 hover:text-primary hover:bg-slate-700 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Uppercase toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            aria-label="Uppercase UUIDs (A–F)"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
          />
          <span className="text-xs text-slate-300">Uppercase</span>
        </label>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          className="ml-auto px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          disabled={isLoading}
        >
          {isLoading && (
            <span
              className="w-3 h-3 rounded-full border-2 border-border-dark border-t-white animate-spin"
              aria-hidden
            />
          )}
          {isLoading ? "Generating..." : "Generate"}
        </button>

        {/* Copy all button */}
        <button
          type="button"
          onClick={handleCopyAll}
          disabled={!uuids.length}
          className="px-3 py-2 text-xs font-medium bg-panel-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copyAllLabel}
        </button>

        {/* Clear button (output only) */}
        {uuids.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setUuids([]);
              setError(null);
            }}
            className="px-4 py-2 text-sm bg-panel-dark text-slate-400 border border-border-dark rounded-lg hover:text-slate-200 hover:border-slate-500 transition-colors"
          >
            Clear
          </button>
        )}
      </footer>
    </div>
  );
}

export default UuidGeneratorTool;

