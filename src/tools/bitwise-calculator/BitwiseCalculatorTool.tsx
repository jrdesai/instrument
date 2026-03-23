import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";

type BitwiseBaseKey = "decimal" | "hexadecimal" | "binary" | "octal";
type BitwiseWidthKey = "bit8" | "bit16" | "bit32" | "bit64";

interface BitwiseResultPayload {
  decimal: string;
  hexadecimal: string;
  binary: string;
  binaryGrouped: string;
  octal: string;
}

/** Matches Rust BitwiseInput (camelCase). */
interface BitwiseInputPayload {
  valueA: string;
  valueB: string;
  fromBase: BitwiseBaseKey;
  bitWidth: BitwiseWidthKey;
  shiftAmount: number;
}

/** Matches Rust BitwiseOutput (camelCase). */
interface BitwiseOutputPayload {
  and?: BitwiseResultPayload | null;
  or?: BitwiseResultPayload | null;
  xor?: BitwiseResultPayload | null;
  nand?: BitwiseResultPayload | null;
  nor?: BitwiseResultPayload | null;
  notA?: BitwiseResultPayload | null;
  shiftLeft?: BitwiseResultPayload | null;
  shiftRight?: BitwiseResultPayload | null;
  rotateLeft?: BitwiseResultPayload | null;
  rotateRight?: BitwiseResultPayload | null;
  bitCountA?: number | null;
  leadingZerosA?: number | null;
  trailingZerosA?: number | null;
  isPowerOfTwoA?: boolean | null;
  error?: string | null;
}

const RUST_COMMAND = "bitwise_process";
const TOOL_ID = "bitwise-calculator";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const BASE_PILLS: { id: BitwiseBaseKey; label: string }[] = [
  { id: "decimal", label: "Dec" },
  { id: "hexadecimal", label: "Hex" },
  { id: "binary", label: "Bin" },
  { id: "octal", label: "Oct" },
];

const TWO_OP_OPS: { key: keyof BitwiseOutputPayload; label: string }[] = [
  { key: "and", label: "AND" },
  { key: "or", label: "OR" },
  { key: "xor", label: "XOR" },
  { key: "nand", label: "NAND" },
  { key: "nor", label: "NOR" },
];

function isBitwiseDraft(
  raw: unknown
): raw is { valueA: string; valueB: string } {
  if (typeof raw !== "object" || raw === null) return false;
  const o = raw as Record<string, unknown>;
  return typeof o.valueA === "string" && typeof o.valueB === "string";
}

const BIT_WIDTH_OPTIONS: { id: BitwiseWidthKey; label: string; maxShift: number }[] = [
  { id: "bit8", label: "8", maxShift: 7 },
  { id: "bit16", label: "16", maxShift: 15 },
  { id: "bit32", label: "32", maxShift: 31 },
  { id: "bit64", label: "64", maxShift: 63 },
];

function ResultCard({
  label,
  result,
  onCopy,
}: {
  label: string;
  result: BitwiseResultPayload | null | undefined;
  onCopy: (text: string) => void;
}) {
  if (!result) return null;
  return (
    <div className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onCopy(result.decimal)}
          className="px-2 py-0.5 text-[10px] font-medium bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:border-primary/60 transition-colors"
        >
          Copy
        </button>
      </div>
      <div className="font-mono text-lg text-slate-800 dark:text-slate-200">{result.decimal}</div>
      <div className="font-mono text-xs text-slate-500 mt-1">
        {result.binaryGrouped}
      </div>
    </div>
  );
}

function BitwiseCalculatorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [valueA, setValueA] = useState("");
  const [valueB, setValueB] = useState("");

  useRestoreDraft(TOOL_ID, (raw) => {
    if (!isBitwiseDraft(raw)) return;
    setValueA(raw.valueA);
    setValueB(raw.valueB);
  });
  const [fromBase, setFromBase] = useState<BitwiseBaseKey>("decimal");
  const [bitWidth, setBitWidth] = useState<BitwiseWidthKey>("bit8");
  const [shiftAmount, setShiftAmount] = useState(1);
  const [output, setOutput] = useState<BitwiseOutputPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const maxShift = BIT_WIDTH_OPTIONS.find((o) => o.id === bitWidth)?.maxShift ?? 7;
  const clampedShift = Math.min(Math.max(0, shiftAmount), maxShift);

  const runProcess = useCallback(
    async (
      a: string,
      b: string,
      base: BitwiseBaseKey,
      width: BitwiseWidthKey,
      shift: number
    ) => {
      if (!a.trim()) {
        setOutput(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const payload: BitwiseInputPayload = {
          valueA: a,
          valueB: b,
          fromBase: base,
          bitWidth: width,
          shiftAmount: shift,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload,
          { skipHistory: true }
        )) as BitwiseOutputPayload;
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
        setOutput({ error: message });
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(valueA, valueB, fromBase, bitWidth, Math.min(Math.max(0, shiftAmount), maxShift));
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [valueA, valueB, fromBase, bitWidth, shiftAmount, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const handleClear = useCallback(() => {
    setValueA("");
    setValueB("");
    setDraft({ valueA: "", valueB: "" });
    setOutput(null);
  }, [setDraft]);

  const hasError = Boolean(output?.error);
  const hasA = valueA.trim() !== "";
  const hasB = valueB.trim() !== "";
  const showTwoOp = hasA && hasB && !hasError && output?.and != null;
  const showSingleOp = hasA && !hasError && output?.notA != null;
  const showAnalysis = hasA && !hasError && output?.bitCountA != null;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Input section */}
      <div className="flex flex-col px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
              Value A
            </label>
            <input
              type="text"
              aria-label="Value A"
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
              placeholder="e.g. 60"
              value={valueA}
              onChange={(e) => {
                const v = e.target.value;
                setValueA(v);
                setDraft({ valueA: v, valueB });
              }}
            />
            {hasError && (
              <p className="text-red-600 dark:text-red-400 text-xs font-mono mt-1">{output?.error}</p>
            )}
          </div>
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
              Value B
            </label>
            <input
              type="text"
              aria-label="Value B"
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-1 focus:ring-primary border border-border-light dark:border-border-dark rounded-lg"
              placeholder="e.g. 13"
              value={valueB}
              onChange={(e) => {
                const v = e.target.value;
                setValueB(v);
                setDraft({ valueA, valueB: v });
              }}
            />
            <p className="text-slate-500 text-xs mt-0.5">
              (optional — for two-operand ops)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {BASE_PILLS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFromBase(id)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                fromBase === id
                  ? "bg-primary text-white"
                  : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {!hasA ? (
          <p className="text-slate-500 text-sm">Enter a value in A to begin</p>
        ) : (
          <>
            {showTwoOp && (
              <section className="mb-6">
                <h2 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-3">
                  A op B
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TWO_OP_OPS.map(({ key, label }) => (
                    <ResultCard
                      key={key}
                      label={label}
                      result={output?.[key] as BitwiseResultPayload | undefined}
                      onCopy={handleCopy}
                    />
                  ))}
                </div>
              </section>
            )}

            {showSingleOp && (
              <section className="mb-6">
                <h2 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-3">
                  Operations on A
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ResultCard
                    label="NOT"
                    result={output?.notA ?? undefined}
                    onCopy={handleCopy}
                  />
                  <ResultCard
                    label={`Shift Left (${clampedShift})`}
                    result={output?.shiftLeft ?? undefined}
                    onCopy={handleCopy}
                  />
                  <ResultCard
                    label={`Shift Right (${clampedShift})`}
                    result={output?.shiftRight ?? undefined}
                    onCopy={handleCopy}
                  />
                  <ResultCard
                    label={`Rotate Left (${clampedShift})`}
                    result={output?.rotateLeft ?? undefined}
                    onCopy={handleCopy}
                  />
                  <ResultCard
                    label={`Rotate Right (${clampedShift})`}
                    result={output?.rotateRight ?? undefined}
                    onCopy={handleCopy}
                  />
                </div>
              </section>
            )}

            {showAnalysis && (
              <section>
                <h2 className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-3">
                  Bit analysis
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
                      1 bits (popcount)
                    </span>
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                      {output?.bitCountA ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
                      Leading zeros
                    </span>
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                      {output?.leadingZerosA ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
                      Trailing zeros
                    </span>
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                      {output?.trailingZerosA ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark rounded-lg p-3">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">
                      Power of two
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium w-fit ${
                        output?.isPowerOfTwoA
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {output?.isPowerOfTwoA ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer: Bit Width | Shift | Actions */}
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
                onClick={() => setBitWidth(id)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  bitWidth === id
                    ? "bg-primary text-white"
                    : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-border-light dark:bg-border-dark self-center mx-3" />

        {/* Shift */}
        <div className="flex flex-col gap-1" role="group" aria-label="Shift">
          <span className="text-slate-600 text-xs uppercase tracking-wider">
            Shift
          </span>
          <input
            type="number"
            min={0}
            max={maxShift}
            aria-label="Shift amount"
            value={shiftAmount}
            onChange={(e) => setShiftAmount(parseInt(e.target.value, 10) || 0)}
            className="w-20 px-2 py-1 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm border border-border-light dark:border-border-dark rounded focus:ring-1 focus:ring-primary"
          />
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
              onClick={handleClear}
              className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
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

export default BitwiseCalculatorTool;
