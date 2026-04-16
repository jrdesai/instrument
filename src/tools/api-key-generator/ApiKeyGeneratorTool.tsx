import {
  useCallback,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
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

      {/* Footer controls */}
      <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Format */}
        <div className="flex flex-col gap-1" role="group" aria-label="Format">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Format
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFormat("raw")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                format === "raw"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Raw
            </button>
            <button
              type="button"
              onClick={() => setFormat("grouped")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                format === "grouped"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Grouped
            </button>
            <button
              type="button"
              onClick={() => setFormat("prefixed")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                format === "prefixed"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Prefixed
            </button>
          </div>
          {showGroupedNote && (
            <span className="text-slate-500 text-xs">
              Length rounded to nearest multiple of 4
            </span>
          )}
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Length */}
        <div className="flex flex-col gap-1" role="group" aria-label="Length">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Length
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease length"
              onClick={() => handleLengthChange(length - 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              min={8}
              max={256}
              value={length}
              onChange={(e) => handleLengthChange(Number(e.target.value))}
              className="w-16 px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              aria-label="Increase length"
              onClick={() => handleLengthChange(length + 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Charset */}
        <div className="flex flex-col gap-1" role="group" aria-label="Charset">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Charset
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCharset("alphanumeric")}
              className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${
                charset === "alphanumeric"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Alphanumeric
            </button>
            <button
              type="button"
              onClick={() => setCharset("alphaOnly")}
              className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${
                charset === "alphaOnly"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Alpha
            </button>
            <button
              type="button"
              onClick={() => setCharset("hexOnly")}
              className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${
                charset === "hexOnly"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Hex
            </button>
            <button
              type="button"
              onClick={() => setCharset("urlSafe")}
              className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${
                charset === "urlSafe"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              URL Safe
            </button>
          </div>
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

        {showPrefixInput && (
          <>
            <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />
            {/* Prefix */}
            <div className="flex flex-col gap-1" role="group" aria-label="Prefix">
              <span className="text-slate-600 text-xs uppercase tracking-wider">
                Prefix
              </span>
              <input
                type="text"
                maxLength={32}
                value={prefix}
                placeholder="sk_live_"
                onChange={(e) => setPrefix(e.target.value)}
                className="w-[140px] px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </>
        )}

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
            <CopyButton
              value={keys.length ? keys.join("\n") : undefined}
              label="Copy all"
              variant="primary"
              className="py-2 text-xs"
            />
            {keys.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ApiKeyGeneratorTool;

