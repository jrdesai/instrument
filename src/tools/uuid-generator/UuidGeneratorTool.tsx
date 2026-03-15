import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";

type UuidVersion = "v1" | "v4" | "v7";
type TabId = "generate" | "inspect";

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

/** Matches Rust UuidInspectOutput (camelCase). */
interface UuidInspectOutputPayload {
  isValid: boolean;
  version?: number | null;
  versionName?: string | null;
  variant?: string | null;
  v1Timestamp?: string | null;
  v1ClockSeq?: number | null;
  v1Node?: string | null;
  v7Timestamp?: string | null;
  asUppercase?: string | null;
  asLowercase?: string | null;
  asUrn?: string | null;
  asBraces?: string | null;
  asRawBytes?: string | null;
  error?: string | null;
}

const RUST_COMMAND_GENERATE = "uuid_process";
const RUST_COMMAND_INSPECT = "uuid_inspect";
export const TOOL_ID = "uuid-generator";
const COPIED_DURATION_MS = 1500;
const INSPECT_DEBOUNCE_MS = 150;

function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_DURATION_MS);
    } catch {
      // ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2 py-1 text-xs font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors shrink-0"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function UuidGeneratorTool() {
  const [activeTab, setActiveTab] = useState<TabId>("generate");
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState<number>(1);
  const [uppercase, setUppercase] = useState(false);
  const [includeHyphens, setIncludeHyphens] = useState(true);
  const [uuids, setUuids] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Inspect tab state
  const [inspectValue, setInspectValue] = useState("");
  const [inspectResult, setInspectResult] = useState<UuidInspectOutputPayload | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const inspectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          RUST_COMMAND_GENERATE,
          payload
        )) as UuidOutputPayload;
        setUuids(result.uuids ?? []);
        setError(result.error ?? null);
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
    []
  );

  const runInspect = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      setInspectResult(null);
      return;
    }
    setInspectLoading(true);
    try {
      const result = (await callTool(RUST_COMMAND_INSPECT, {
        value: trimmed,
      })) as UuidInspectOutputPayload;
      setInspectResult(result);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : String(e ?? "Inspect failed");
      setInspectResult({
        isValid: false,
        error: message,
      });
    } finally {
      setInspectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (inspectDebounceRef.current) clearTimeout(inspectDebounceRef.current);
    if (activeTab !== "inspect") return;
    const trimmed = inspectValue.trim();
    if (trimmed === "") {
      setInspectResult(null);
      return;
    }
    inspectDebounceRef.current = setTimeout(() => {
      runInspect(inspectValue);
      inspectDebounceRef.current = null;
    }, INSPECT_DEBOUNCE_MS);
    return () => {
      if (inspectDebounceRef.current) clearTimeout(inspectDebounceRef.current);
    };
  }, [inspectValue, activeTab, runInspect]);

  const handleGenerate = useCallback(() => {
    runProcess(version, count, uppercase);
  }, [version, count, uppercase, runProcess]);

  const displayUuids = uuids.map((u) =>
    includeHyphens ? u : u.replace(/-/g, "")
  );

  const handleCopyLine = useCallback(
    async (index: number) => {
      const value = displayUuids[index];
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), COPIED_DURATION_MS);
      } catch {
        // ignore copy errors
      }
    },
    [displayUuids]
  );

  const handleCopyAll = useCallback(async () => {
    if (!displayUuids.length) return;
    try {
      await navigator.clipboard.writeText(displayUuids.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    }
  }, [displayUuids]);

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

  const inspectEmpty = inspectValue.trim() === "";
  const showInspectValidBadge =
    !inspectEmpty && inspectResult != null && !inspectLoading;
  const inspectValid = inspectResult?.isValid === true;
  const inspectInvalid = !inspectEmpty && inspectResult != null && !inspectResult.isValid;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <button
          type="button"
          onClick={() => setActiveTab("generate")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "generate"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("inspect")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "inspect"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Inspect
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-sm">
        <div className="flex flex-col">
          <span className="font-semibold">UUID Generator</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {activeTab === "generate" ? headerLabel : "Inspect any UUID"}
          </span>
        </div>
      </div>

      {activeTab === "generate" && (
        <>
          {/* Output list */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
            {error ? (
              <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">
                {error}
              </div>
            ) : uuids.length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                Click Generate to create UUIDs
              </p>
            ) : (
              <ul className="space-y-2">
                {displayUuids.map((id, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark"
                  >
                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
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
          <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            {/* Version */}
            <div
              className="flex flex-col gap-1"
              role="group"
              aria-label="UUID version"
            >
              <span className="text-slate-600 text-xs uppercase tracking-wider">
                Version
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVersion("v1")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    version === "v1"
                      ? "bg-primary text-white"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  V1
                </button>
                <button
                  type="button"
                  onClick={() => setVersion("v4")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    version === "v4"
                      ? "bg-primary text-white"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  V7 — Time-ordered
                </button>
              </div>
              {version === "v1" && (
                <span className="text-slate-500 text-xs">
                  Time-based · Fixed node
                </span>
              )}
            </div>

            <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

            {/* Count */}
            <div className="flex flex-col gap-1" role="group" aria-label="Count">
              <span className="text-slate-600 text-xs uppercase tracking-wider">
                Count
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease count"
                  onClick={() => handleCountChange(count - 1)}
                  className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => handleCountChange(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  aria-label="Increase count"
                  onClick={() => handleCountChange(count + 1)}
                  className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

            {/* Options */}
            <div className="flex flex-col gap-1" role="group" aria-label="Options">
              <span className="text-slate-600 text-xs uppercase tracking-wider">
                Options
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Uppercase UUIDs (A–F)"
                    checked={uppercase}
                    onChange={(e) => setUppercase(e.target.checked)}
                    className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Uppercase</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Include hyphens"
                    checked={includeHyphens}
                    onChange={(e) => setIncludeHyphens(e.target.checked)}
                    className="rounded border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Include hyphens</span>
                </label>
              </div>
            </div>

            <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

            {/* Actions (no label) */}
            <div
              className="flex flex-col gap-1 ml-auto"
              role="group"
              aria-label="Actions"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
                <button
                  type="button"
                  onClick={handleCopyAll}
                  disabled={!uuids.length}
                  className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {copyAllLabel}
                </button>
                {uuids.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUuids([]);
                      setError(null);
                    }}
                    className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </footer>
        </>
      )}

      {activeTab === "inspect" && (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inspectValue}
              onChange={(e) => setInspectValue(e.target.value)}
              placeholder="Paste any UUID to inspect..."
              className="flex-1 px-3 py-2 text-sm font-mono bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {showInspectValidBadge && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium shrink-0 ${
                  inspectValid
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {inspectValid ? "✓ Valid" : "✗ Invalid"}
              </span>
            )}
          </div>

          {inspectLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span
                className="w-3 h-3 rounded-full border-2 border-border-dark border-t-primary animate-spin"
                aria-hidden
              />
              Inspecting…
            </div>
          )}

          {!inspectEmpty && inspectInvalid && inspectResult?.error && (
            <div className="text-red-600 dark:text-red-400 text-sm font-mono">
              {inspectResult.error}
            </div>
          )}

          {inspectEmpty && (
            <p className="text-slate-500 text-sm italic">
              Paste a UUID above
            </p>
          )}

          {inspectValid && inspectResult && (
            <div className="space-y-4">
              {/* Row 1 — Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                    Version
                  </div>
                  <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                    {inspectResult.version ?? "—"}
                  </div>
                  {inspectResult.versionName && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {inspectResult.versionName}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                    Variant
                  </div>
                  <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                    {inspectResult.variant ?? "—"}
                  </div>
                </div>
              </div>

              {/* Row 2 — Format cards with Copy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Standard", value: inspectResult.asLowercase },
                  { label: "Uppercase", value: inspectResult.asUppercase },
                  { label: "URN", value: inspectResult.asUrn },
                  { label: "Braces", value: inspectResult.asBraces },
                  { label: "Raw bytes", value: inspectResult.asRawBytes },
                ].map(
                  (item) =>
                    item.value && (
                      <div
                        key={item.label}
                        className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                            {item.label}
                          </div>
                          <div className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                            {item.value}
                          </div>
                        </div>
                        <CopyButton value={item.value} />
                      </div>
                    )
                )}
              </div>

              {/* Row 3 — Version specific (v1 / v7) */}
              {(inspectResult.version === 1 || inspectResult.version === 7) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inspectResult.version === 1 && (
                    <>
                      {inspectResult.v1Timestamp && (
                        <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                            Timestamp
                          </div>
                          <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                            {inspectResult.v1Timestamp}
                          </div>
                        </div>
                      )}
                      {inspectResult.v1ClockSeq != null && (
                        <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                            Clock Seq
                          </div>
                          <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                            {inspectResult.v1ClockSeq}
                          </div>
                        </div>
                      )}
                      {inspectResult.v1Node && (
                        <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                            Node
                          </div>
                          <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                            {inspectResult.v1Node}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {inspectResult.version === 7 && inspectResult.v7Timestamp && (
                    <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        Timestamp
                      </div>
                      <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                        {inspectResult.v7Timestamp}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UuidGeneratorTool;
