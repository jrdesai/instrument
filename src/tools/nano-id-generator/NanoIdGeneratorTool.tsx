import { useCallback, useState } from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import type { NanoIdInput } from "../../bindings/NanoIdInput";
import type { NanoIdOutput } from "../../bindings/NanoIdOutput";

const RUST_COMMAND = "tool_nanoid_process";
export const TOOL_ID = "nano-id-generator";
const COPIED_DURATION_MS = 1500;
const MIN_SIZE = 4;
const MAX_SIZE = 256;
const DEFAULT_SIZE = 21;

type AlphabetPreset =
  | "default"
  | "alphanumeric"
  | "lowercase"
  | "hex"
  | "numbers"
  | "custom";

const ALPHABET_PRESETS: {
  id: AlphabetPreset;
  label: string;
  value: string | null;
}[] = [
  { id: "default", label: "Default", value: null },
  {
    id: "alphanumeric",
    label: "Alphanumeric",
    value: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  },
  {
    id: "lowercase",
    label: "Lowercase",
    value: "abcdefghijklmnopqrstuvwxyz0123456789",
  },
  { id: "hex", label: "Hex", value: "0123456789abcdef" },
  { id: "numbers", label: "Numbers", value: "0123456789" },
  { id: "custom", label: "Custom", value: null },
];

function NanoIdGeneratorTool() {
  const [count, setCount] = useState(1);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [preset, setPreset] = useState<AlphabetPreset>("default");
  const [customAlphabet, setCustomAlphabet] = useState("");
  const { setDraft } = useDraftInput("nano-id-generator");
  useRestoreStringDraft("nano-id-generator", setCustomAlphabet);
  const [ids, setIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy all");

  const resolvedAlphabet = (): string | null => {
    if (preset === "custom") return customAlphabet.trim() || null;
    return ALPHABET_PRESETS.find((p) => p.id === preset)?.value ?? null;
  };

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: NanoIdInput = {
        count,
        size,
        alphabet: resolvedAlphabet(),
      };
      const result = (await callTool(RUST_COMMAND, payload)) as NanoIdOutput;
      setIds(result.ids ?? []);
      setError(result.error ?? null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to generate Nano IDs"
      );
      setIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [count, size, preset, customAlphabet]);

  const handleCopyLine = useCallback(
    async (index: number) => {
      const value = ids[index];
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), COPIED_DURATION_MS);
      } catch {
        // ignore
      }
    },
    [ids]
  );

  const handleCopyAll = useCallback(async () => {
    if (!ids.length) return;
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy all"), COPIED_DURATION_MS);
    }
  }, [ids]);

  const handleClear = useCallback(() => {
    setIds([]);
    setError(null);
  }, []);

  const handleCountChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    setCount(Math.min(100, Math.max(1, value)));
  }, []);

  const handleSizeChange = useCallback((value: number) => {
    if (Number.isNaN(value)) return;
    setSize(Math.min(MAX_SIZE, Math.max(MIN_SIZE, value)));
  }, []);

  const headerLabel =
    ids.length > 0
      ? `${ids.length} ${ids.length === 1 ? "Nano ID" : "Nano IDs"}`
      : "No Nano IDs generated yet";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-sm">
        <div className="flex flex-col">
          <span className="font-semibold">Nano ID Generator</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {headerLabel}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            URL-safe, compact, random identifiers
          </span>
        </div>
      </div>

      {/* Options */}
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark space-y-3">
        {/* Alphabet preset pills */}
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Alphabet
          </div>
          <div className="flex flex-wrap gap-1">
            {ALPHABET_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  preset === p.id
                    ? "bg-primary text-white border-primary"
                    : "bg-background-light dark:bg-background-dark text-slate-500 dark:text-slate-400 border-border-light dark:border-border-dark hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom alphabet input — only shown when Custom preset selected */}
        {preset === "custom" && (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Custom alphabet
            </div>
            <input
              type="text"
              value={customAlphabet}
              onChange={(e) => {
                setCustomAlphabet(e.target.value);
                setDraft(e.target.value);
              }}
              placeholder="e.g. ABCDEF0123456789"
              className="w-full px-3 py-2 text-sm font-mono bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {customAlphabet.trim().length > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {new Set(customAlphabet.trim()).size} unique characters
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output list */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {error ? (
          <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">
            {error}
          </div>
        ) : ids.length === 0 ? (
          <p className="text-slate-500 text-sm italic">
            Click Generate to create Nano IDs
          </p>
        ) : (
          <ul className="space-y-2">
            {ids.map((id, index) => (
              <li
                key={id}
                className="flex items-center justify-between gap-3 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark"
              >
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                  {id}
                </span>
                <button
                  type="button"
                  aria-label="Copy ID"
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
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Count */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
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
              className="w-14 px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
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

        {/* Size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Size
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease size"
              onClick={() => handleSizeChange(size - 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              min={MIN_SIZE}
              max={MAX_SIZE}
              value={size}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className="w-14 px-2 py-1 text-xs bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              aria-label="Increase size"
              onClick={() => handleSizeChange(size + 1)}
              className="px-2 py-1 text-xs rounded-lg bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Generate */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="ml-auto px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading && (
            <span
              className="w-3 h-3 rounded-full border-2 border-border-dark border-t-white animate-spin"
              aria-hidden
            />
          )}
          {isLoading ? "Generating..." : "Generate"}
        </button>

        {/* Copy all */}
        <button
          type="button"
          onClick={handleCopyAll}
          disabled={!ids.length}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {copyAllLabel}
        </button>

        {/* Clear */}
        {ids.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
          >
            Clear
          </button>
        )}
      </footer>
    </div>
  );
}

export default NanoIdGeneratorTool;

