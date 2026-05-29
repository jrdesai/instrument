import {
  useCallback,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton, PillButton, ToolbarFooter } from "../../components/tool";
import type { ApiKeyCharset } from "../../bindings/ApiKeyCharset";
import type { ApiKeyFormat } from "../../bindings/ApiKeyFormat";
import type { ApiKeyInput } from "../../bindings/ApiKeyInput";
import type { ApiKeyOutput } from "../../bindings/ApiKeyOutput";

const RUST_COMMAND = "tool_api_key_process";
export const TOOL_ID = "api-key-generator";
function ApiKeyGeneratorTool() {
  const [prefix, setPrefix] = useState<string>("");
  const [length, setLength] = useState<number>(32);
  const [format, setFormat] = useState<ApiKeyFormat>("raw");
  const [charset, setCharset] = useState<ApiKeyCharset>("alphanumeric");
  const [count, setCount] = useState<number>(1);
  const [keys, setKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runProcess = useCallback(
    async (
      currentCount: number,
      currentLength: number,
      currentPrefix: string,
      currentFormat: ApiKeyFormat,
      currentCharset: ApiKeyCharset
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const payload: ApiKeyInput = {
          count: currentCount,
          length: currentLength,
          prefix: currentPrefix,
          format: currentFormat,
          charset: currentCharset,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as ApiKeyOutput;
        setKeys(result.keys ?? []);
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
        setKeys([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleGenerate = useCallback(() => {
    runProcess(count, length, prefix, format, charset);
  }, [count, length, prefix, format, charset, runProcess]);

  const handleClear = useCallback(() => {
    setKeys([]);
    setError(null);
  }, []);

  const handleCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(100, Math.max(1, value));
    setCount(clamped);
  }, []);

  const handleLengthChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(256, Math.max(8, value));
    setLength(clamped);
  }, []);

  const headerCount = keys.length;
  const headerLabel =
    headerCount > 0
      ? `${headerCount} ${headerCount === 1 ? "API key" : "API keys"}`
      : "No API keys generated yet";

  const showPrefixInput = format === "prefixed";
  const showGroupedNote = format === "grouped";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-sm">
        <div className="flex flex-col">
          <span className="font-semibold">API Key Generator</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{headerLabel}</span>
        </div>
      </div>

      {/* Output list */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {error ? (
          <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">
            {error}
          </div>
        ) : keys.length === 0 ? (
          <p className="text-slate-500 text-sm italic">
            Click Generate to create API keys
          </p>
        ) : (
          <ul className="space-y-2">
            {keys.map((key, index) => (
              <li
                key={`key-${index}`}
                className="flex items-center justify-between gap-3 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark"
              >
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                  {key}
                </span>
                <CopyButton
                  value={key}
                  variant="icon"
                  aria-label="Copy API key"
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            lock
          </span>
          <span>Keys are generated locally and never transmitted</span>
        </div>
      </div>

      <ToolbarFooter
        groups={[
          {
            label: "Format",
            children: (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <PillButton
                    size="sm"
                    active={format === "raw"}
                    onClick={() => setFormat("raw")}
                  >
                    Raw
                  </PillButton>
                  <PillButton
                    size="sm"
                    active={format === "grouped"}
                    onClick={() => setFormat("grouped")}
                  >
                    Grouped
                  </PillButton>
                  <PillButton
                    size="sm"
                    active={format === "prefixed"}
                    onClick={() => setFormat("prefixed")}
                  >
                    Prefixed
                  </PillButton>
                </div>
                {showGroupedNote && (
                  <span className="text-xs text-slate-500">
                    Length rounded to nearest multiple of 4
                  </span>
                )}
              </div>
            ),
          },
          {
            label: "Length",
            children: (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease length"
                  onClick={() => handleLengthChange(length - 1)}
                  className="rounded-lg bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  -
                </button>
                <input
                  type="number"
                  min={8}
                  max={256}
                  value={length}
                  onChange={(e) => handleLengthChange(Number(e.target.value))}
                  className="w-16 rounded-lg border border-border-light bg-background-light px-2 py-1 text-center text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-100"
                />
                <button
                  type="button"
                  aria-label="Increase length"
                  onClick={() => handleLengthChange(length + 1)}
                  className="rounded-lg bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  +
                </button>
              </div>
            ),
          },
          {
            label: "Charset",
            children: (
              <>
                <PillButton
                  size="sm"
                  active={charset === "alphanumeric"}
                  onClick={() => setCharset("alphanumeric")}
                >
                  Alphanumeric
                </PillButton>
                <PillButton
                  size="sm"
                  active={charset === "alphaOnly"}
                  onClick={() => setCharset("alphaOnly")}
                >
                  Alpha
                </PillButton>
                <PillButton
                  size="sm"
                  active={charset === "hexOnly"}
                  onClick={() => setCharset("hexOnly")}
                >
                  Hex
                </PillButton>
                <PillButton
                  size="sm"
                  active={charset === "urlSafe"}
                  onClick={() => setCharset("urlSafe")}
                >
                  URL Safe
                </PillButton>
              </>
            ),
          },
          {
            label: "Count",
            children: (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease count"
                  onClick={() => handleCountChange(count - 1)}
                  className="rounded-lg bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
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
                  className="rounded-lg bg-background-light px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:bg-background-dark dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  +
                </button>
              </div>
            ),
          },
          ...(showPrefixInput
            ? [
                {
                  label: "Prefix",
                  children: (
                    <input
                      type="text"
                      maxLength={32}
                      value={prefix}
                      placeholder="sk_live_"
                      onChange={(e) => setPrefix(e.target.value)}
                      className="w-[140px] rounded-lg border border-border-light bg-background-light px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-100"
                    />
                  ),
                },
              ]
            : []),
          {
            end: true,
            children: (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading && (
                    <span
                      className="h-3 w-3 animate-spin rounded-full border-2 border-border-dark border-t-white"
                      aria-hidden
                    />
                  )}
                  {isLoading ? "Generating..." : "Generate"}
                </button>
                <CopyButton
                  value={keys.length ? keys.join("\n") : undefined}
                  label="Copy all"
                  variant="primary"
                />
                {keys.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-full px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export default ApiKeyGeneratorTool;

