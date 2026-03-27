import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { BaseConverterInput } from "../../bindings/BaseConverterInput";
import type { BaseConverterOutput } from "../../bindings/BaseConverterOutput";
import type { BitWidth } from "../../bindings/BitWidth";
import type { NumberBase } from "../../bindings/NumberBase";

const RUST_COMMAND = "base_converter_process";
const TOOL_ID = "number-base-converter";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const COPIED_DURATION_MS = 1500;

const BASE_PILLS: { id: NumberBase; label: string }[] = [
  { id: "decimal", label: "Dec" },
  { id: "hexadecimal", label: "Hex" },
  { id: "binary", label: "Bin" },
  { id: "octal", label: "Oct" },
  { id: "base32", label: "Base32" },
  { id: "base36", label: "Base36" },
];

const OUTPUT_CARDS: {
  id: keyof Omit<BaseConverterOutput, "error" | "isNegative">;
  label: string;
}[] = [
  { id: "decimal", label: "Decimal" },
  { id: "hexadecimal", label: "Hexadecimal" },
  { id: "binary", label: "Binary" },
  { id: "binaryGrouped", label: "Binary (grouped)" },
  { id: "octal", label: "Octal" },
  { id: "base32", label: "Base 32" },
  { id: "base36", label: "Base 36" },
  { id: "bitLength", label: "Bit length" },
];

const PLACEHOLDERS: Record<NumberBase, string> = {
  decimal: "Enter decimal (e.g. 255)",
  hexadecimal: "Enter hex (e.g. ff or 0xff)",
  binary: "Enter binary (e.g. 11111111 or 0b11111111)",
  octal: "Enter octal (e.g. 377 or 0o377)",
  base32: "Enter base32 (e.g. 7V)",
  base36: "Enter base36 (e.g. 73)",
};

const BIT_WIDTH_OPTIONS: { id: BitWidth; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "bit8", label: "8" },
  { id: "bit16", label: "16" },
  { id: "bit32", label: "32" },
  { id: "bit64", label: "64" },
];

function NumberBaseConverterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [value, setValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setValue);
  const [fromBase, setFromBase] = useState<NumberBase>("decimal");
  const [bitWidth, setBitWidth] = useState<BitWidth>("auto");
  const [uppercaseHex, setUppercaseHex] = useState(false);
  const [output, setOutput] = useState<BaseConverterOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy All");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (
      currentValue: string,
      currentBase: NumberBase,
      currentBitWidth: BitWidth,
      currentUppercaseHex: boolean
    ) => {
      if (!currentValue.trim()) {
        setOutput(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const payload: BaseConverterInput = {
          value: currentValue,
          fromBase: currentBase,
          bitWidth: currentBitWidth,
          uppercaseHex: currentUppercaseHex,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as BaseConverterOutput;
        setOutput(result);
        if (!result.error) {
          if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
          historyDebounceRef.current = setTimeout(() => {
            addHistoryEntry(TOOL_ID, {
              input: payload,
              output: result,
              timestamp: Date.now(),
            });
            historyDebounceRef.current = null;
          }, HISTORY_DEBOUNCE_MS);
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
        setOutput({
          decimal: "",
          hexadecimal: "",
          binary: "",
          binaryGrouped: "",
          octal: "",
          base32: "",
          base36: "",
          bitLength: 0,
          isNegative: false,
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(value, fromBase, bitWidth, uppercaseHex);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fromBase, bitWidth, uppercaseHex, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleClear = useCallback(() => {
    setValue("");
    setDraft("");
    setOutput(null);
  }, [setDraft]);

  const handleCopyValue = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (!output || output.error) return;
    const lines = OUTPUT_CARDS.map(({ id, label }) => {
      const v = output[id];
      const str = typeof v === "number" ? String(v) : String(v ?? "");
      return `${label}: ${str}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyAllLabel("Copied");
      setTimeout(() => setCopyAllLabel("Copy All"), COPIED_DURATION_MS);
    } catch {
      setCopyAllLabel("Copy failed");
      setTimeout(() => setCopyAllLabel("Copy All"), COPIED_DURATION_MS);
    }
  }, [output]);

  const hasError = Boolean(output?.error);
  const displayOutput = hasError ? null : output;
  const inputBaseId = fromBase;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Input row */}
      <div className="flex flex-col px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {BASE_PILLS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-label={`Input base: ${label}`}
              onClick={() => setFromBase(id)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                fromBase === id
                  ? "bg-primary text-white"
                  : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Number to convert"
            className="flex-1 min-w-0 px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
            placeholder={PLACEHOLDERS[fromBase]}
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              setValue(v);
              setDraft(v);
            }}
          />
        </div>
        {hasError && (
          <p className="text-red-600 dark:text-red-400 text-xs font-mono mt-2">
            {output?.error}
          </p>
        )}
      </div>

      {/* Output cards */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {OUTPUT_CARDS.map(({ id, label }) => {
            const raw = displayOutput?.[id];
            const valueStr =
              typeof raw === "number" ? String(raw) : String(raw ?? "");
            const display = valueStr || "—";
            const isInputBase =
              (id === "decimal" && inputBaseId === "decimal") ||
              (id === "hexadecimal" && inputBaseId === "hexadecimal") ||
              (id === "binary" && inputBaseId === "binary") ||
              (id === "octal" && inputBaseId === "octal") ||
              (id === "base32" && inputBaseId === "base32") ||
              (id === "base36" && inputBaseId === "base36");
            return (
              <div
                key={id}
                className={`flex flex-col border rounded-lg p-3 transition-colors ${
                  isInputBase
                    ? "border-primary/40 bg-primary/5 hover:border-primary/50"
                    : "border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyValue(valueStr)}
                    disabled={!valueStr || valueStr === "—"}
                    className="px-2 py-0.5 text-[10px] font-medium bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                  {display}
                </pre>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: Bit Width | Options | Actions */}
      <footer className="flex items-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Bit Width */}
        <div className="flex flex-col gap-1" role="group" aria-label="Bit width">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Bit Width
          </span>
          <div className="flex items-center gap-1">
            {BIT_WIDTH_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-label={`Bit width ${label}`}
                onClick={() => setBitWidth(id)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  bitWidth === id
                    ? "bg-primary text-white"
                    : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Options */}
        <div className="flex flex-col gap-1" role="group" aria-label="Options">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Options
          </span>
          <button
            type="button"
            aria-pressed={uppercaseHex}
            onClick={() => setUppercaseHex((v) => !v)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              uppercaseHex
                ? "bg-primary text-white"
                : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {uppercaseHex ? "On" : "Off"}
          </button>
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
              onClick={handleCopyAll}
              disabled={!displayOutput}
              className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copyAllLabel}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            >
              Clear
            </button>
            {isLoading && (
              <span className="text-xs text-primary">Processing…</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default NumberBaseConverterTool;
