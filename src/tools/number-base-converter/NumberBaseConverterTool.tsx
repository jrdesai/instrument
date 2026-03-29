import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CopyButton, PillButton, ToolbarFooter } from "../../components/tool";
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

  const hasError = Boolean(output?.error);
  const displayOutput = hasError ? null : output;
  const inputBaseId = fromBase;

  const copyAllValue = useMemo(() => {
    if (!output || output.error) return "";
    return OUTPUT_CARDS.map(({ id, label }) => {
      const v = output[id];
      const str = typeof v === "number" ? String(v) : String(v ?? "");
      return `${label}: ${str}`;
    }).join("\n");
  }, [output]);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Input row */}
      <div className="flex flex-col px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {BASE_PILLS.map(({ id, label }) => (
            <PillButton
              key={id}
              active={fromBase === id}
              onClick={() => setFromBase(id)}
              variant="outlined"
              size="sm"
              aria-label={`Input base: ${label}`}
            >
              {label}
            </PillButton>
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

      <ToolbarFooter
        groups={[
          {
            label: "Bit Width",
            children: (
              <>
                {BIT_WIDTH_OPTIONS.map(({ id, label }) => (
                  <PillButton
                    key={id}
                    active={bitWidth === id}
                    onClick={() => setBitWidth(id)}
                    variant="outlined"
                    size="sm"
                    className="rounded"
                    aria-label={`Bit width ${label}`}
                  >
                    {label}
                  </PillButton>
                ))}
              </>
            ),
          },
          {
            label: "Options",
            children: (
              <button
                type="button"
                aria-pressed={uppercaseHex}
                onClick={() => setUppercaseHex((v) => !v)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  uppercaseHex
                    ? "bg-primary text-white"
                    : "border border-border-light bg-panel-light text-slate-500 hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {uppercaseHex ? "On" : "Off"}
              </button>
            ),
          },
          {
            end: true,
            ariaLabel: "Actions",
            children: (
              <>
                <CopyButton
                  value={copyAllValue || undefined}
                  label="Copy All"
                  variant="outline"
                  className="px-3 py-2"
                />
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-border-light bg-panel-light px-4 py-2 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
                >
                  Clear
                </button>
                {isLoading ? (
                  <span className="text-xs text-primary">Processing…</span>
                ) : null}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export default NumberBaseConverterTool;
