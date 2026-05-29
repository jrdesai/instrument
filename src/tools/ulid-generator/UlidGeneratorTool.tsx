import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { ToolbarFooter } from "../../components/tool";
import type { UlidInput } from "../../bindings/UlidInput";
import type { UlidInspectInput } from "../../bindings/UlidInspectInput";
import type { UlidInspectOutput } from "../../bindings/UlidInspectOutput";
import type { UlidOutput } from "../../bindings/UlidOutput";

type TabId = "generate" | "inspect";

const RUST_COMMAND_GENERATE = "tool_ulid_process";
const RUST_COMMAND_INSPECT = "tool_ulid_inspect";
export const TOOL_ID = "ulid-generator";
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

function UlidGeneratorTool() {
  const [activeTab, setActiveTab] = useState<TabId>("generate");
  const [count, setCount] = useState<number>(1);
  const [uppercase, setUppercase] = useState(true);
  const [ulids, setUlids] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [inspectValue, setInspectValue] = useState("");
  const [inspectResult, setInspectResult] =
    useState<UlidInspectOutput | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const inspectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runProcess = useCallback(
    async (currentCount: number, currentUppercase: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const payload: UlidInput = {
          count: currentCount,
          uppercase: currentUppercase,
        };
        const result = (await callTool(
          RUST_COMMAND_GENERATE,
          payload
        )) as UlidOutput;
        setUlids(result.ulids ?? []);
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
        setUlids([]);
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
      const inspectPayload: UlidInspectInput = { value: trimmed };
      const result = (await callTool(
        RUST_COMMAND_INSPECT,
        inspectPayload
      )) as UlidInspectOutput;
      setInspectResult(result);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : String(e ?? "Inspect failed");
      setInspectResult({
        isValid: false,
        timestampMs: null,
        timestampHuman: null,
        timestampIso: null,
        randomness: null,
        asUppercase: null,
        asLowercase: null,
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
    runProcess(count, uppercase);
  }, [count, uppercase, runProcess]);

  const handleCopyLine = useCallback(async (index: number) => {
    const value = ulids[index];
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), COPIED_DURATION_MS);
    } catch {
      // ignore copy errors
    }
  }, [ulids]);

  const handleCopyAll = useCallback(async () => {
    if (!ulids.length) return;
    try {
      await navigator.clipboard.writeText(ulids.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    }
  }, [ulids]);

  const handleCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(100, Math.max(1, value));
    setCount(clamped);
  }, []);

  const headerCount = ulids.length;
  const headerLabel =
    headerCount > 0
      ? `${headerCount} ${headerCount === 1 ? "ULID" : "ULIDs"}`
      : "No ULIDs generated yet";

  const inspectEmpty = inspectValue.trim() === "";
  const showInspectValidBadge =
    !inspectEmpty && inspectResult != null && !inspectLoading;
  const inspectValid = inspectResult?.isValid === true;
  const inspectInvalid =
    !inspectEmpty && inspectResult != null && !inspectResult.isValid;

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
          <span className="font-semibold">ULID Generator</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {activeTab === "generate" ? headerLabel : "Inspect any ULID"}
          </span>
          {activeTab === "generate" && (
            <span className="text-slate-500 text-xs">
              ULIDs are time-sortable, URL-safe, and monotonically increasing
            </span>
          )}
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
            ) : ulids.length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                Click Generate to create ULIDs
              </p>
            ) : (
              <ul className="space-y-2">
                {ulids.map((id, index) => (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-3 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark"
                  >
                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                      {id}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy ULID"
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

          <ToolbarFooter
            groups={[
              {
                label: "Count",
                children: (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Decrease count"
                      onClick={() => handleCountChange(count - 1)}
                      className="rounded-lg border border-border-light bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-300"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={count}
                      onChange={(e) => handleCountChange(Number(e.target.value))}
                      className="w-16 rounded-lg border border-border-light bg-background-light px-2 py-1 text-center text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-100"
                    />
                    <button
                      type="button"
                      aria-label="Increase count"
                      onClick={() => handleCountChange(count + 1)}
                      className="rounded-lg border border-border-light bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-300"
                    >
                      +
                    </button>
                  </div>
                ),
              },
              {
                label: "Options",
                children: (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label="Uppercase ULIDs"
                      checked={uppercase}
                      onChange={(e) => setUppercase(e.target.checked)}
                      className="rounded border-border-light bg-background-light text-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">Uppercase</span>
                  </label>
                ),
              },
              {
                end: true,
                children: (
                  <>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span
                          className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                          aria-hidden
                        />
                      ) : null}
                      {isLoading ? "Generating..." : "Generate"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      disabled={!ulids.length}
                      className="rounded-full border border-border-light px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-dark dark:text-slate-400"
                    >
                      {copyAllLabel}
                    </button>
                  </>
                ),
              },
            ]}
          />
        </>
      )}

      {activeTab === "inspect" && (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inspectValue}
              onChange={(e) => setInspectValue(e.target.value)}
              placeholder="Paste any ULID to inspect..."
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

          {inspectInvalid && inspectResult?.error && (
            <div className="text-red-600 dark:text-red-400 text-xs font-mono">
              {inspectResult.error}
            </div>
          )}

          {inspectEmpty && (
            <p className="text-slate-500 text-sm italic">
              Paste a ULID above
            </p>
          )}

          {inspectValid && inspectResult && (
            <div className="space-y-4">
              {/* Row 1 — Timestamp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {inspectResult.timestampMs != null && (
                  <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        Timestamp (ms)
                      </div>
                      <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                        {inspectResult.timestampMs}
                      </div>
                    </div>
                    <CopyButton
                      value={String(inspectResult.timestampMs)}
                      label="Copy"
                    />
                  </div>
                )}
                {inspectResult.timestampHuman && (
                  <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        Human readable
                      </div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                        {inspectResult.timestampHuman}
                      </div>
                    </div>
                    <CopyButton value={inspectResult.timestampHuman} />
                  </div>
                )}
                {inspectResult.timestampIso && (
                  <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        ISO 8601
                      </div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                        {inspectResult.timestampIso}
                      </div>
                    </div>
                    <CopyButton value={inspectResult.timestampIso} />
                  </div>
                )}
              </div>

              {/* Row 2 — Randomness */}
              {inspectResult.randomness && (
                <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                      Randomness
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      80-bit random component
                    </div>
                    <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                      {inspectResult.randomness}
                    </div>
                  </div>
                  <CopyButton value={inspectResult.randomness} />
                </div>
              )}

              {/* Row 3 — Formats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inspectResult.asUppercase && (
                  <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        Uppercase
                      </div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                        {inspectResult.asUppercase}
                      </div>
                    </div>
                    <CopyButton value={inspectResult.asUppercase} />
                  </div>
                )}
                {inspectResult.asLowercase && (
                  <div className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        Lowercase
                      </div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                        {inspectResult.asLowercase}
                      </div>
                    </div>
                    <CopyButton value={inspectResult.asLowercase} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UlidGeneratorTool;
